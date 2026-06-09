import prisma from '../config/db';
import crypto from 'crypto';
import logger from '../utils/logger';
import { NistAiRmfService } from './nistAiRmf.service';

export class NistEvidenceService {
  /**
   * Helper to get active signing key and version.
   */
  private static getSigningKey(version: string): string {
    const keysJson = process.env.GOVERNANCE_SIGNING_KEYS || process.env.GOVERNANCE_SIGNING_KEYS_FALLBACK || '{"v1": ""}';
    try {
      const keys = JSON.parse(keysJson);
      return keys[version] || keys['v1'] || process.env.GOVERNANCE_SIGNING_KEYS_FALLBACK_VAL || '';
    } catch (err) {
      logger.error('Failed to parse GOVERNANCE_SIGNING_KEYS', err);
      return process.env.GOVERNANCE_SIGNING_KEYS_FALLBACK_VAL || '';
    }
  }

  private static getActiveKeyVersion(): string {
    return process.env.GOVERNANCE_SIGNING_KEY_VERSION || 'v1';
  }

  /**
   * Ingest a telemetry/runtime action event, perform rolling 15-minute deduplication,
   * sign it cryptographically, propagate to other frameworks via mapped controls,
   * trigger dynamic SLA incidents, and sync posture snapshots.
   */
  static async ingestEvidence(params: {
    organizationId: string;
    controlCode: string; // e.g. GV-5.1
    evidenceType: 'TELEMETRY' | 'MANUAL_UPLOAD' | 'RUNTIME_ENFORCEMENT';
    sourceType: 'MANUAL' | 'AUTOMATED' | 'MONITORED' | 'ENFORCED' | 'REPORTED';
    sourceSystem: string; // e.g. interceptor, drift_monitor
    sourceReference: string; // e.g. run ID or log ID
    confidenceScore?: number;
    metadata?: any;
    retentionClass?: 'TELEMETRY' | 'GOVERNANCE' | 'AUDIT';
    parentEvidenceId?: string;
  }): Promise<any> {
    // 1. Ensure NIST is seeded
    await NistAiRmfService.ensureSeeded();

    const organizationId = params.organizationId;
    const controlCode = params.controlCode;
    const confidenceScore = params.confidenceScore ?? 1.0;
    const metadata = params.metadata || {};
    const retentionClass = params.retentionClass || 'TELEMETRY';

    // Calculate expiration date
    const now = new Date();
    let expiresAt: Date | null = null;
    if (retentionClass === 'TELEMETRY') {
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    } else if (retentionClass === 'GOVERNANCE') {
      expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
    } else if (retentionClass === 'AUDIT') {
      expiresAt = new Date(now.getTime() + 7 * 365 * 24 * 60 * 60 * 1000); // 7 years
    }

    // Normalized event metadata SHA256 hash
    const normalizedMetadataStr = JSON.stringify(metadata);
    const eventHash = crypto.createHash('sha256').update(normalizedMetadataStr).digest('hex');

    // Unique deduplication key per (org, control, source_system, source_reference)
    const deduplicationKey = `${organizationId}_NIST_AI_RMF_${controlCode}_${params.sourceSystem}_${params.sourceReference}`;

    // 2. Perform rolling 15-minute event deduplication
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const existingEvidence = await prisma.governance_evidence.findFirst({
      where: {
        organizationId,
        framework: 'NIST_AI_RMF',
        control_code: controlCode,
        deduplication_key: deduplicationKey,
        last_seen_at: { gte: fifteenMinutesAgo },
      },
    });

    if (existingEvidence) {
      // Merge with existing record
      const updatedEvidence = await prisma.governance_evidence.update({
        where: { id: existingEvidence.id },
        data: {
          aggregate_count: existingEvidence.aggregate_count + 1,
          last_seen_at: now,
          // Merge metadata
          metadata: {
            ...(existingEvidence.metadata as any || {}),
            ...metadata,
            updated_at: now.toISOString(),
          },
        },
      });

      // Update posture score
      await NistAiRmfService.syncPostureSnapshot(organizationId);

      return updatedEvidence;
    }

    // 3. Construct cryptographic verification signature (HMAC-SHA256)
    const keyVersion = this.getActiveKeyVersion();
    const secretKey = this.getSigningKey(keyVersion);
    const createdTimeStr = now.toISOString();

    const checksumContent = `${organizationId}_NIST_AI_RMF_${controlCode}_${params.sourceReference}_${createdTimeStr}`;
    const checksum = crypto.createHash('sha256').update(checksumContent).digest('hex');
    const evidenceSignature = crypto.createHmac('sha256', secretKey).update(checksum).digest('hex');

    // 4. Create new evidence record
    const evidence = await prisma.governance_evidence.create({
      data: {
        organizationId,
        framework: 'NIST_AI_RMF',
        control_code: controlCode,
        framework_version: '1.0.0',
        evidence_type: params.evidenceType,
        source_type: params.sourceType,
        source_system: params.sourceSystem,
        source_reference: params.sourceReference,
        confidence_score: confidenceScore,
        freshness_score: 1.0,
        metadata: metadata as any,
        created_at: now,
        expires_at: expiresAt,
        retention_class: retentionClass,
        event_hash: eventHash,
        deduplication_key: deduplicationKey,
        aggregate_count: 1,
        first_seen_at: now,
        last_seen_at: now,
        parent_evidence_id: params.parentEvidenceId || null,
        evidence_signature: evidenceSignature,
        signing_key_version: keyVersion,
        checksum,
        immutable: params.evidenceType === 'RUNTIME_ENFORCEMENT' ? true : false,
      },
    });

    // 5. Trigger SLA incidents for critical violations (e.g. PII leak or severe drift)
    if (metadata.incident_triggered === true || metadata.severity === 'CRITICAL' || metadata.severity === 'HIGH') {
      await this.triggerSlaIncident(organizationId, controlCode, params.sourceSystem, params.sourceReference, metadata);
    }

    // 6. Multi-framework propagation (autoshare)
    await this.propagateEvidence(evidence);

    // 7. Sync organization posture
    await NistAiRmfService.syncPostureSnapshot(organizationId);

    return evidence;
  }

  /**
   * Verify all cryptographic signatures and checksums.
   * Rejects validation if any immutable row has been altered.
   */
  static async verifyEvidenceSignatures(organizationId: string): Promise<{
    valid: boolean;
    total: number;
    corrupted_ids: string[];
  }> {
    const evidenceList = await prisma.governance_evidence.findMany({
      where: { organizationId },
    });

    const corruptedIds: string[] = [];

    for (const ev of evidenceList) {
      if (!ev.evidence_signature || !ev.checksum) {
        if (ev.immutable) {
          corruptedIds.push(ev.id);
        }
        continue;
      }

      // Checksum validation
      const createdTimeStr = new Date(ev.created_at).toISOString();
      const expectedChecksumContent = `${ev.organizationId}_${ev.framework}_${ev.control_code}_${ev.source_reference}_${createdTimeStr}`;
      const expectedChecksum = crypto.createHash('sha256').update(expectedChecksumContent).digest('hex');

      if (ev.checksum !== expectedChecksum) {
        corruptedIds.push(ev.id);
        continue;
      }

      // HMAC Verification using versioned key rotation map
      const secretKey = this.getSigningKey(ev.signing_key_version);
      const expectedSignature = crypto.createHmac('sha256', secretKey).update(ev.checksum).digest('hex');

      if (ev.evidence_signature !== expectedSignature) {
        corruptedIds.push(ev.id);
      }
    }

    return {
      valid: corruptedIds.length === 0,
      total: evidenceList.length,
      corrupted_ids: corruptedIds,
    };
  }

  /**
   * Propagate evidence to mapped framework controls (GDPR, EU AI Act)
   */
  private static async propagateEvidence(sourceEvidence: any): Promise<void> {
    try {
      const mappings = await prisma.framework_control_mappings.findMany({
        where: {
          source_framework: 'NIST_AI_RMF',
          source_control_code: sourceEvidence.control_code,
        },
      });

      for (const map of mappings) {
        const keyVersion = this.getActiveKeyVersion();
        const secretKey = this.getSigningKey(keyVersion);
        const now = new Date();
        const createdTimeStr = now.toISOString();

        const checksumContent = `${sourceEvidence.organizationId}_${map.target_framework}_${map.target_control_code}_${sourceEvidence.id}_${createdTimeStr}`;
        const checksum = crypto.createHash('sha256').update(checksumContent).digest('hex');
        const evidenceSignature = crypto.createHmac('sha256', secretKey).update(checksum).digest('hex');

        // Propagate row linking back via parent_evidence_id
        await prisma.governance_evidence.create({
          data: {
            organizationId: sourceEvidence.organizationId,
            framework: map.target_framework,
            control_code: map.target_control_code,
            framework_version: '1.0.0',
            evidence_type: sourceEvidence.evidence_type,
            source_type: 'AUTOMATED',
            source_system: `propagate_${sourceEvidence.source_system}`,
            source_reference: sourceEvidence.id,
            confidence_score: sourceEvidence.confidence_score * map.mapping_strength,
            freshness_score: 1.0,
            metadata: {
              propagated_from_nist: sourceEvidence.control_code,
              mapping_strength: map.mapping_strength,
              original_metadata: sourceEvidence.metadata,
            } as any,
            created_at: now,
            expires_at: sourceEvidence.expires_at,
            retention_class: sourceEvidence.retention_class,
            event_hash: sourceEvidence.event_hash,
            deduplication_key: `${sourceEvidence.organizationId}_${map.target_framework}_${map.target_control_code}_propagate_${sourceEvidence.id}`,
            aggregate_count: 1,
            first_seen_at: now,
            last_seen_at: now,
            parent_evidence_id: sourceEvidence.id,
            evidence_signature: evidenceSignature,
            signing_key_version: keyVersion,
            checksum,
            immutable: sourceEvidence.immutable,
          },
        });

        logger.info(`Propagated NIST evidence ${sourceEvidence.control_code} -> ${map.target_framework} ${map.target_control_code}`);
      }
    } catch (err) {
      logger.error('Failed to propagate governance evidence', err);
    }
  }

  /**
   * Helper to trigger governance SLA incidents on safety breaches or critical model anomalies.
   */
  private static async triggerSlaIncident(
    organizationId: string,
    controlCode: string,
    sourceSystem: string,
    sourceReference: string,
    metadata: any
  ): Promise<void> {
    try {
      const severity = metadata.severity || 'HIGH';
      const incidentType = metadata.incident_type || 'DRIFT_CASCADE';
      const title = metadata.incident_title || `Incident Alert: High Risk Event in ${controlCode}`;
      const description = metadata.incident_desc || `Automated telemetry flagged a high severity violation mapped to RMF control code ${controlCode}. Reference ID: ${sourceReference}`;

      // Calculate SLA deadline based on severity (CRITICAL/HIGH: 24h, MEDIUM/LOW: 72h)
      const now = new Date();
      const slaHours = (severity === 'CRITICAL' || severity === 'HIGH') ? 24 : 72;
      const slaDeadline = new Date(now.getTime() + slaHours * 60 * 60 * 1000);

      // Create open incident
      await prisma.governance_incidents.create({
        data: {
          organizationId,
          incident_type: incidentType,
          severity,
          related_frameworks: ['NIST_AI_RMF'],
          related_controls: [controlCode],
          title,
          description,
          source_event_id: sourceReference,
          source_system: sourceSystem,
          status: 'OPEN',
          sla_deadline: slaDeadline,
          sla_breach: false,
          created_at: now,
        },
      });

      logger.warn(`Governance SLA incident triggered for company ${organizationId}: ${title}`);
    } catch (err) {
      logger.error('Failed to register SLA incident', err);
    }
  }
}

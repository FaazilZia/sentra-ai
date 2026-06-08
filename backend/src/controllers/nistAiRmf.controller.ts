import { Response } from 'express';
import { NistAiRmfService, SeedingInProgressError } from '../services/nistAiRmf.service';
import { NistEvidenceService } from '../services/nistEvidence.service';
import { GovernanceHealthService } from '../services/governanceHealth.service';
import { ComplianceService } from '../services/compliance.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';
import prisma from '../config/db';

/**
 * Handle SeedingInProgressError helper.
 */
function handleServiceError(res: Response, err: any) {
  if (err instanceof SeedingInProgressError) {
    return res.status(503).json({
      status: 'seeding',
      message: err.message,
    });
  }
  return sendError(res, 500, err.message || 'Internal Server Error');
}

export const getNistAiRmfOverview = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  try {
    const overview = await NistAiRmfService.getFrameworkOverview(organizationId);
    return sendSuccess(res, overview);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

export const getNistAiRmfControls = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  try {
    const overview = await NistAiRmfService.getFrameworkOverview(organizationId);
    const controls: any[] = [];
    for (const f of overview.functions) {
      for (const c of f.categories) {
        for (const sub of c.subcategories) {
          controls.push({
            code: sub.code,
            title: sub.title,
            status: sub.status,
            maturityLevel: sub.maturityLevel,
            score: sub.score,
            telemetryLinked: sub.telemetryLinked,
            lastEvidenceAt: sub.lastEvidenceAt,
            function: f.title,
            category: c.title,
            createdAt: sub.createdAt || null
          });
        }
      }
    }
    return sendSuccess(res, controls);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

export const updateNistAiRmfImplementation = asyncHandler(async (req: any, res: Response) => {
  const { subcategoryCode } = req.params;
  const { status, maturity_level, risk_escalation_level, notes } = req.body;
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  try {
    const impl = await NistAiRmfService.updateImplementation(organizationId, subcategoryCode, {
      status,
      maturity_level: maturity_level ? parseInt(maturity_level) : undefined,
      risk_escalation_level,
      notes,
      owner_user_id: req.user?.id || 'system',
    });

    // Log compliance audit audit-trail
    await ComplianceService.logAudit(
      req.user?.id || 'system',
      organizationId,
      'UPDATE_NIST_AI_RMF_CONTROL',
      undefined,
      { subcategoryCode, status }
    ).catch(() => {});

    return sendSuccess(res, impl);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

export const getNistAiRmfCrossFrameworkImpact = asyncHandler(async (req: any, res: Response) => {
  const { subcategoryCode } = req.params;
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  try {
    await NistAiRmfService.ensureSeeded();

    const mappings = await prisma.framework_control_mappings.findMany({
      where: {
        source_framework: 'NIST_AI_RMF',
        source_control_code: subcategoryCode,
      },
    });

    // Return empty mappings array [] (not a 404) when no mappings exist
    const formattedMappings = mappings.map(m => ({
      targetFramework: m.target_framework,
      targetControlCode: m.target_control_code,
      mappingStrength: m.mapping_strength,
      description: `Maps NIST ${subcategoryCode} directly to ${m.target_framework} control ${m.target_control_code} with ${Math.round(m.mapping_strength * 100)}% coverage strength.`,
    }));

    return sendSuccess(res, {
      subcategoryCode,
      mappings: formattedMappings,
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
});

export const exportNistAiRmfSignedConformity = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  try {
    await NistAiRmfService.ensureSeeded();

    // 1. Verify all cryptographic HMAC signatures
    const verification = await NistEvidenceService.verifyEvidenceSignatures(organizationId);

    // 2. Fetch posture status
    const overview = await NistAiRmfService.getFrameworkOverview(organizationId);

    // 3. Fetch all active evidence items
    const evidence = await prisma.governance_evidence.findMany({
      where: {
        organizationId,
        framework: 'NIST_AI_RMF',
        archived_at: null,
      },
      orderBy: { created_at: 'desc' },
    });

    return sendSuccess(res, {
      export_date: new Date().toISOString(),
      organization_id: organizationId,
      framework: 'NIST_AI_RMF 1.0',
      posture_score: overview.score,
      integrity_check: {
        all_signatures_valid: verification.valid,
        total_records_checked: verification.total,
        corrupted_record_count: verification.corrupted_ids.length,
        corrupted_ids: verification.corrupted_ids,
      },
      evidence_ledger: evidence.map(ev => ({
        id: ev.id,
        control_code: ev.control_code,
        evidence_type: ev.evidence_type,
        source_system: ev.source_system,
        source_reference: ev.source_reference,
        created_at: ev.created_at,
        checksum: ev.checksum,
        signature: ev.evidence_signature,
        key_version: ev.signing_key_version,
        immutable: ev.immutable,
        aggregate_count: ev.aggregate_count,
      })),
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
});

export const getNistAiRmfHealth = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  try {
    await NistAiRmfService.ensureSeeded();
    const diagnostics = await GovernanceHealthService.getHealthDiagnostics();
    return sendSuccess(res, diagnostics);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

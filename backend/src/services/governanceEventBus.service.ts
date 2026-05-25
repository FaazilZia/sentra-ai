import { NistEvidenceService } from './nistEvidence.service';
import logger from '../utils/logger';

export class GovernanceEventBus {
  /**
   * Centralized event bus for emitting operational telemetry events into the compliance engine.
   * Feeds directly into the deduplication, propagation, and signing pipeline.
   */
  static async emitTelemetryEvent(params: {
    organizationId: string;
    controlCode: string; // e.g. GV-5.1
    evidenceType: 'TELEMETRY' | 'MANUAL_UPLOAD' | 'RUNTIME_ENFORCEMENT';
    sourceType: 'MANUAL' | 'AUTOMATED' | 'MONITORED' | 'ENFORCED' | 'REPORTED';
    sourceSystem: string;
    sourceReference: string;
    confidenceScore?: number;
    metadata?: any;
    retentionClass?: 'TELEMETRY' | 'GOVERNANCE' | 'AUDIT';
  }): Promise<any> {
    try {
      logger.info(
        `[GovernanceEventBus] Telemetry event received: control ${params.controlCode} from ${params.sourceSystem}`
      );
      
      const evidence = await NistEvidenceService.ingestEvidence(params);
      
      return evidence;
    } catch (err: any) {
      logger.error(
        `[GovernanceEventBus] Failed to process telemetry event: ${err.message}`,
        err
      );
      throw err;
    }
  }
}

import prisma from '../config/db';
import logger from '../utils/logger';

/**
 * Enterprise Policy Versioning Service
 * Manages policy snapshots, publishing workflows, and point-in-time rollbacks.
 */

export class PolicyVersioningService {
  /**
   * Capture a new version of a policy.
   * Typically called before or after a policy update.
   */
  static async captureVersion(policyId: string, organizationId: string) {
    try {
      const policy = await prisma.policies.findUnique({
        where: { id: policyId, organizationId }
      });

      if (!policy) throw new Error('Policy not found');

      // Create snapshot in policy_versions
      const version = await prisma.policy_versions.create({
        data: {
          policy_id: policy.id,
          organizationId: policy.organizationId,
          version: policy.current_version,
          name: policy.name,
          description: policy.description,
          enabled: policy.enabled,
          priority: policy.priority,
          effect: policy.effect,
          status: policy.status,
          scope: policy.scope || {},
          conditions: policy.conditions || {},
          obligations: policy.obligations || {},
          is_published_snapshot: policy.status === 'published'
        }
      });

      logger.info(`Policy version ${version.version} captured for policy ${policyId}`);
      return version;
    } catch (error) {
      logger.error('Failed to capture policy version:', error);
      throw error;
    }
  }

  /**
   * Rollback a policy to a specific version.
   */
  static async rollback(policyId: string, versionNumber: number, organizationId: string) {
    try {
      const snapshot = await prisma.policy_versions.findUnique({
        where: { 
          policy_id_version: {
            policy_id: policyId,
            version: versionNumber
          }
        }
      });

      if (!snapshot || snapshot.organizationId !== organizationId) {
        throw new Error('Version snapshot not found or unauthorized');
      }

      // Update the live policy with snapshot data
      const updatedPolicy = await prisma.policies.update({
        where: { id: policyId },
        data: {
          name: snapshot.name,
          description: snapshot.description,
          enabled: snapshot.enabled,
          priority: snapshot.priority,
          effect: snapshot.effect,
          status: 'published', // Rollbacks are typically immediate
          scope: snapshot.scope || {},
          conditions: snapshot.conditions || {},
          obligations: snapshot.obligations || {},
          current_version: { increment: 1 } // Increment live version after rollback
        }
      });

      // Log the rollback as an audit event
      await prisma.audit_logs.create({
        data: {
          organizationId,
          user_id: 'SYSTEM', // In a real app, pass the actual user ID
          action: 'POLICY_ROLLBACK',
          metadata: { policyId, fromVersion: versionNumber, toVersion: updatedPolicy.current_version }
        }
      });

      return updatedPolicy;
    } catch (error) {
      logger.error('Policy rollback failed:', error);
      throw error;
    }
  }
}

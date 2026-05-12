import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class OutcomeService {
  /**
   * Validates the outcome of a compliance fix
   */
  static async validateOutcome(featureId: string, actionId?: string) {
    // 1. Get latest two snapshots to compare
    const snapshots = await prisma.compliance_snapshots.findMany({
      where: { featureId },
      orderBy: { created_at: 'desc' },
      take: 2
    });

    if (snapshots.length < 2) {
      throw new Error("Insufficient snapshots for validation.");
    }

    const current = snapshots[0];
    const previous = snapshots[1];

    // 2. Calculate scores
    const currentScore = (current.gdpr_score + current.dpdp_score + current.hipaa_score) / 3;
    const previousScore = (previous.gdpr_score + previous.dpdp_score + previous.hipaa_score) / 3;

    // 3. Determine status and confidence
    const scoreImproved = currentScore > previousScore;
    const riskReduced = this.isRiskLower(current.risk_level, previous.risk_level);
    
    const status = (scoreImproved || riskReduced) ? "verified" : "failed";
    const confidence = scoreImproved && riskReduced ? "High" : "Medium";

    // 4. Record validation
    return await prisma.outcome_validations.create({
      data: {
        feature_id: featureId,
        action_id: actionId,
        previous_score: previousScore,
        new_score: currentScore,
        previous_risk: previous.risk_level,
        new_risk: current.risk_level,
        validation_status: status,
        outcome_confidence: confidence
      }
    });
  }

  private static isRiskLower(current: string, previous: string): boolean {
    const weights: Record<string, number> = { 'low': 1, 'medium': 2, 'high': 3 };
    return weights[current.toLowerCase()] < weights[previous.toLowerCase()];
  }
}

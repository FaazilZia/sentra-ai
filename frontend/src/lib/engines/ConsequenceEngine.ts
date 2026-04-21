export interface Consequence {
  description: string;
  impactScore: number;
  riskChange: string;
  regulatoryExposure: boolean;
}

export class ConsequenceEngine {
  static predictInaction(currentScore: number, issueCount: number): Consequence {
    const projectedDrop = Math.min(issueCount * 2.5, currentScore - 10);
    const newScore = Math.max(0, currentScore - projectedDrop);
    
    return {
      description: `Compliance projected to drop: ${currentScore}% → ${newScore}%`,
      impactScore: projectedDrop,
      riskChange: issueCount > 3 ? "Low → High" : "Low → Medium",
      regulatoryExposure: issueCount > 2
    };
  }
}

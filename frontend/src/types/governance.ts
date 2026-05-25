export type ReasonType = "degradation" | "improvement" | "decay" | "incident_breach" | "health_penalty";

export interface GovernanceReason {
  type: ReasonType;
  value: number;
  msg: string;
}

export interface PostureGaugeProps {
  score: number; // 0-100. If 0, renders a warning state: "No governance evidence ingested".
  reasons: GovernanceReason[]; // Empty array when no posture modifications are registered.
}

export interface MaturityMatrixProps {
  functions: Array<{
    code: "GOVERN" | "MAP" | "MEASURE" | "MANAGE";
    score: number;
    subcategories: Array<{
      code: string; // e.g. GV-1.1
      status: "NOT_STARTED" | "IN_PROGRESS" | "IMPLEMENTED" | "NOT_APPLICABLE"; // NOT_STARTED subcategories display zero progress bar fill.
      maturityLevel: number; // 1-5
      telemetryLinked: number;
    }>;
  }>;
}

export interface SOCHubProps {
  incidents: Array<{
    id: string;
    incident_type: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    title: string;
    sla_deadline: string;
    sla_breach: boolean;
    status: "OPEN" | "RESOLVED";
  }>; // Renders a centered "No active governance incidents cataloged" illustration when empty.
}

export interface CrossFrameworkImpactProps {
  subcategoryCode: string;
  mappings: Array<{
    targetFramework: string; // e.g. "GDPR" | "EU_AI_ACT"
    targetControlCode: string; // e.g. "EU-AIA-9-1"
    mappingStrength: number; // 0.0 to 1.0
    description: string;
  }>; // Returns an empty mappings array [] (not a 404) when no mappings exist for that subcategory.
}

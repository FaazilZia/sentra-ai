/**
 * NIST AI Risk Management Framework (RMF) 1.0 Seeder Service
 * 
 * References:
 * - NIST AI RMF 1.0 Official Standard (January 2023)
 * - Framework version: 1.0
 */

import logger from '../utils/logger';

export const NIST_AI_RMF_SEED_DATA = {
  functions: [
    {
      function_code: "GOVERN",
      title: "Govern",
      description: "Cultivate a culture of risk management and risk governance within the organization. Governance sets the foundation for organizational processes, policies, and workforce structure.",
      categories: [
        {
          category_code: "GV-1",
          title: "Policies, Processes, and Procedures",
          description: "Organizational policies, processes, procedures, and practices regarding AI risk management are established, transparent, and actively maintained.",
          subcategories: [
            {
              subcategory_code: "GV-1.1",
              title: "Legal & Regulatory Alignment",
              description: "AI policies align with applicable laws, regulations, and organizational values.",
              implementation_examples: ["Incorporate GDPR and EU AI Act compliance checks into system design rules.", "Conduct legal compliance assessments for generative AI agents."],
              suggested_evidence: ["Legal compliance review document", "Regulatory alignment registry entry"],
              telemetry_sources: ["audit_logs", "workflow_approvals"],
              severity_weight: 8,
              depends_on_control: null
            },
            {
              subcategory_code: "GV-1.2",
              title: "System-level Risk Cadence",
              description: "AI system risk management cadences are defined and scheduled throughout the system lifecycle.",
              implementation_examples: ["Schedule continuous drift scans every 12 hours.", "Review system evaluations weekly."],
              suggested_evidence: ["Drift schedule log", "Weekly scoring review log"],
              telemetry_sources: ["drift_alerts"],
              severity_weight: 6,
              depends_on_control: null
            },
            {
              subcategory_code: "GV-1.3",
              title: "Publishing System Parameters",
              description: "System parameters, guidelines, and user disclosures are published transparently.",
              implementation_examples: ["Provide clear notice in user interfaces informing natural persons of AI interactions.", "Generate documentation detailing capabilities and limitations."],
              suggested_evidence: ["User notice screenshots", "System limitation disclosures"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 4,
              depends_on_control: null
            }
          ]
        },
        {
          category_code: "GV-2",
          title: "Accountability Structures",
          description: "Roles, responsibilities, and authority for AI risk management are clearly defined, communicated, and documented.",
          subcategories: [
            {
              subcategory_code: "GV-2.1",
              title: "Oversight Responsibility Assignment",
              description: "Organizational roles for AI system oversight, including authority for approvals, are explicitly assigned.",
              implementation_examples: ["Formally assign human approval oversight roles to qualified compliance managers.", "Track user workflow task completions with timestamps."],
              suggested_evidence: ["Workflow oversight matrix", "Human approval audit trails"],
              telemetry_sources: ["workflow_approvals"],
              severity_weight: 10,
              depends_on_control: "GV-1.1"
            },
            {
              subcategory_code: "GV-2.2",
              title: "Interruption & Interception Authority",
              description: "Authority and technical mechanisms to interrupt, halt, or decommission AI systems are defined and implemented.",
              implementation_examples: ["Implement fail-closed boundaries inside the core action interceptor pipeline.", "Grant administrator authority to instantly block high-risk agent outcomes."],
              suggested_evidence: ["Interceptor configuration settings", "Emergency stop override log"],
              telemetry_sources: ["interception_logs", "workflow_approvals"],
              severity_weight: 9,
              depends_on_control: null
            }
          ]
        },
        {
          category_code: "GV-3",
          title: "Workforce & Training",
          description: "Workforce members are trained in AI risk management practices and possess necessary competence and resources.",
          subcategories: [
            {
              subcategory_code: "GV-3.1",
              title: "Workforce Governance Training",
              description: "Workforce members receive training on AI safety, cybersecurity, and compliance standards.",
              implementation_examples: ["Distribute prompt injection and jailbreak risk training modules.", "Mandate compliance certifications for agent developers."],
              suggested_evidence: ["Training curriculum", "Employee certification logs"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 4,
              depends_on_control: null
            },
            {
              subcategory_code: "GV-3.2",
              title: "Bias and Fairness Competency",
              description: "Workforce competency in identifying statistical bias, model drift, and ethical constraints is verified.",
              implementation_examples: ["Train auditors on model evaluation benchmarking.", "Define baseline thresholds for behavioral anomalies."],
              suggested_evidence: ["Audit competence records", "Benchmark dataset evaluation configurations"],
              telemetry_sources: ["evaluation_results"],
              severity_weight: 5,
              depends_on_control: null
            }
          ]
        },
        {
          category_code: "GV-4",
          title: "Monitoring & Oversight",
          description: "Organizational processes for ongoing monitoring and oversight of AI systems are established.",
          subcategories: [
            {
              subcategory_code: "GV-4.1",
              title: "Independent Auditing Cadence",
              description: "AI systems are audited by independent parties or structured internal processes at regular intervals.",
              implementation_examples: ["Establish monthly automated compliance snapshot summaries.", "Review cryptographic evidence signatures recursively."],
              suggested_evidence: ["Monthly snapshot audit log", "Signed conformity package"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 7,
              depends_on_control: null
            },
            {
              subcategory_code: "GV-4.2",
              title: "Governance System Monitoring",
              description: "The governance infrastructure itself is monitored for operational health and reliability.",
              implementation_examples: ["Log BullMQ worker queue depths and processing latencies periodically.", "Monitor SMTP alert dispatcher uptime."],
              suggested_evidence: ["Governance health telemetry dashboard", "Worker reliability logs"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 8,
              depends_on_control: null
            }
          ]
        },
        {
          category_code: "GV-5",
          title: "Risk Management Strategy",
          description: "A continuous iterative risk management process covering estimation, estimation, evaluation, and mitigation is established.",
          subcategories: [
            {
              subcategory_code: "GV-5.1",
              title: "Information Protection & PII Policies",
              description: "Policies and technical safeguards protect natural persons' data privacy and prevent PII leakage.",
              implementation_examples: ["Scan incoming agent actions for credit cards, SSNs, Aadhaar, and passports at Step 0.", "Automatically redact raw PII in database log records."],
              suggested_evidence: ["PII scanner regex configuration", "Redacted audit logs"],
              telemetry_sources: ["pii_detection_events", "interception_logs"],
              severity_weight: 9,
              depends_on_control: "GV-1.1"
            },
            {
              subcategory_code: "GV-5.2",
              title: "Dynamic Risk Escalation Triggering",
              description: "Thresholds are established to automatically escalate repeated compliance incidents or anomalies.",
              implementation_examples: ["Define automatic warning/critical escalation states when PII violations exceed baseline frequencies.", "Trigger high-severity SOC alerts on repeated blocks."],
              suggested_evidence: ["Risk escalation policy document", "SOC incident logs"],
              telemetry_sources: ["interception_logs", "pii_detection_events"],
              severity_weight: 8,
              depends_on_control: null
            }
          ]
        },
        {
          category_code: "GV-6",
          title: "Third-Party Risk",
          description: "Risks associated with third-party components, data, and models are identified and governed.",
          subcategories: [
            {
              subcategory_code: "GV-6.1",
              title: "Third-Party Component Scans",
              description: "AI-BOM dependencies and third-party models are scanned for vulnerabilities and compliance gaps.",
              implementation_examples: ["Generate a software bill of materials (SBOM) for AI agent packages.", "Scan external connector APIs and enforce authentication rules."],
              suggested_evidence: ["SBOM registry", "Connector scans summary"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 6,
              depends_on_control: null
            },
            {
              subcategory_code: "GV-6.2",
              title: "Model Provider Disclosures",
              description: "Service-level capabilities, limitations, and security policies of external model providers are cataloged.",
              implementation_examples: ["Maintain a register of external LLM endpoints and their associated privacy flags.", "Verify model license bounds."],
              suggested_evidence: ["Model provider inventory", "License verification registry"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 5,
              depends_on_control: null
            }
          ]
        }
      ]
    },
    {
      function_code: "MAP",
      title: "Map",
      description: "Establish the context to understand and manage AI system risks, classifying systems, stakeholders, data, and impacts.",
      categories: [
        {
          category_code: "MP-1",
          title: "Context Establishment",
          description: "The organizational context, mission, and scope for AI system deployment are documented.",
          subcategories: [
            {
              subcategory_code: "MP-1.1",
              title: "Business Objective Scope",
              description: "The intended business objective and scope of deployment are established and documented.",
              implementation_examples: ["Define the system capabilities and business mission of natural language agents.", "Incorporate business limitations into governance files."],
              suggested_evidence: ["Intended scope document", "System mission specification"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 5,
              depends_on_control: null
            },
            {
              subcategory_code: "MP-1.2",
              title: "Target Population Assessment",
              description: "The intended target populations, user interactions, and potential vulnerabilities are documented.",
              implementation_examples: ["Analyze vulnerability metrics for user demographics.", "Restrict children interaction scopes."],
              suggested_evidence: ["Target population analysis", "Demographic restriction settings"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 5,
              depends_on_control: null
            },
            {
              subcategory_code: "MP-1.3",
              title: "Lifecycle Planning Documentation",
              description: "A comprehensive plan for decommissioning or safely updating the AI system is established.",
              implementation_examples: ["Draft an end-of-life decommission checklist for agent services.", "Schedule periodic legacy model retirements."],
              suggested_evidence: ["Decommission procedures", "Lifecycle review register"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 3,
              depends_on_control: null
            }
          ]
        },
        {
          category_code: "MP-2",
          title: "AI System Classification",
          description: "AI systems are classified by capability, tier, and associated risk categories.",
          subcategories: [
            {
              subcategory_code: "MP-2.1",
              title: "Risk-tier Assignment",
              description: "The system is evaluated against compliance benchmarks and assigned an appropriate risk tier.",
              implementation_examples: ["Categorize agents into High Risk, Prohibited, or Limited tiers per EU AI Act guidelines.", "Enforce stricter guardrails on High-Risk systems."],
              suggested_evidence: ["Risk-tier registry database entries", "Guardrail configuration schema"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 8,
              depends_on_control: "MP-1.1"
            },
            {
              subcategory_code: "MP-2.2",
              title: "Agent Capabilities Inventory",
              description: "An up-to-date catalog of all active agents, models, and system prompts is maintained.",
              implementation_examples: ["Record agent configurations, name, model parameters, and base prompts on system creation.", "Track baseline sample events for drift scans."],
              suggested_evidence: ["Live AI Agent inventory database", "Agent configurations dashboard"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 7,
              depends_on_control: null
            }
          ]
        },
        {
          category_code: "MP-3",
          title: "Stakeholder Analysis",
          description: "Relevant stakeholders, deployers, and impacted populations are identified.",
          subcategories: [
            {
              subcategory_code: "MP-3.1",
              title: "Deployer Responsibility Mapping",
              description: "Responsibilities between AI system providers and deployers are negotiated and documented.",
              implementation_examples: ["Set system-level authorization parameters separating provider controls from deployer parameters.", "Incorporate provider terms into intake forms."],
              suggested_evidence: ["Responsibility matrix agreement", "Intake verification settings"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 6,
              depends_on_control: null
            },
            {
              subcategory_code: "MP-3.2",
              title: "Feedback Channels",
              description: "Structured pathways are established for natural persons and stakeholders to submit feedback or appeal decisions.",
              implementation_examples: ["Provide a feedback form inside agent chat frames.", "Enforce human override appeal triggers."],
              suggested_evidence: ["Feedback pipeline logs", "Appeal tracking records"],
              telemetry_sources: ["workflow_approvals"],
              severity_weight: 5,
              depends_on_control: null
            }
          ]
        },
        {
          category_code: "MP-4",
          title: "Impact & Harm Identification",
          description: "Potential negative impacts, systematic harms, and safety risks are identified and documented.",
          subcategories: [
            {
              subcategory_code: "MP-4.1",
              title: "Harm & Bias Identification",
              description: "Foreseeable bias, discrimination, or systemic harms of model outputs are modeled.",
              implementation_examples: ["Run regular bias evaluation benchmarks on datasets.", "Document model tendencies on controversial inputs."],
              suggested_evidence: ["Bias analysis report", "Evaluation metrics overview"],
              telemetry_sources: ["evaluation_results"],
              severity_weight: 6,
              depends_on_control: null
            },
            {
              subcategory_code: "MP-4.2",
              title: "Safety Threshold Modeling",
              description: "Maximum allowable error rates and behavioral risk parameters are defined.",
              implementation_examples: ["Define semantic risk thresholds on prompt parameters.", "Establish maximum allowed probability limits on toxic outputs."],
              suggested_evidence: ["Semantic risk threshold configuration", "Policy limit document"],
              telemetry_sources: ["interception_logs"],
              severity_weight: 7,
              depends_on_control: null
            }
          ]
        },
        {
          category_code: "MP-5",
          title: "Data & Input Mapping",
          description: "Data lineages, annotations, collection processes, and input types are mapped.",
          subcategories: [
            {
              subcategory_code: "MP-5.1",
              title: "Data Lineage & Source Tracking",
              description: "The source, collection processes, and preparation annotations of datasets are tracked.",
              implementation_examples: ["Maintain dataset cards describing training and testing splits.", "Log data ingestion steps with hash verification."],
              suggested_evidence: ["Data lineage map", "Dataset card records"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 6,
              depends_on_control: null
            },
            {
              subcategory_code: "MP-5.2",
              title: "Input Validation Scans",
              description: "Input patterns are validated to prevent adversarial payloads, prompt injections, or data poisoning.",
              implementation_examples: ["Scan inputs against prompt injection regular expressions before processing.", "Audit database inputs for format compliance."],
              suggested_evidence: ["Input validation schema config", "Blocked injection logs"],
              telemetry_sources: ["interception_logs"],
              severity_weight: 8,
              depends_on_control: null
            }
          ]
        }
      ]
    },
    {
      function_code: "MEASURE",
      title: "Measure",
      description: "Analyze, benchmark, and monitor AI system risks, verifying safety, security, robust outcomes, and drift continuously.",
      categories: [
        {
          category_code: "ME-1",
          title: "Risk Evaluation",
          description: "AI system risks are evaluated, scored, and mapped against organizational risk thresholds.",
          subcategories: [
            {
              subcategory_code: "ME-1.1",
              title: "Semantic Risk Profiling",
              description: "Inbound prompts and agent actions are profiled semantically for safety violations.",
              implementation_examples: ["Execute semantic risk scans mapping embeddings to danger zones.", "Evaluate risk severity (0-100) dynamically on intercept."],
              suggested_evidence: ["Semantic scan database logs", "Risk evaluation report"],
              telemetry_sources: ["interception_logs"],
              severity_weight: 9,
              depends_on_control: "GV-1.2"
            },
            {
              subcategory_code: "ME-1.2",
              title: "Impact Assessment Scoring",
              description: "Organizational impacts of potential agent failures are estimated quantitatively.",
              implementation_examples: ["Run quantitative risk calculator queries periodically.", "Aggregate model outputs to assess risk distributions."],
              suggested_evidence: ["Risk score aggregation sheets", "Quantitative assessment log"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 7,
              depends_on_control: null
            },
            {
              subcategory_code: "ME-1.3",
              title: "Vulnerability Scanning",
              description: "Model parameters, credentials, and API connectors are audited for security vulnerabilities.",
              implementation_examples: ["Run credential scanners looking for hardcoded secrets.", "Validate JWT parameter bounds on authentication checks."],
              suggested_evidence: ["API security report", "Secrets scan log"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 8,
              depends_on_control: null
            }
          ]
        },
        {
          category_code: "ME-2",
          title: "Bias & Fairness Testing",
          description: "AI systems are evaluated for statistical bias, outcome disparity, and demographic parity.",
          subcategories: [
            {
              subcategory_code: "ME-2.1",
              title: "Statistical Parity Benchmarking",
              description: "Benchmark datasets are run against the decision pipeline to evaluate disparities.",
              implementation_examples: ["Run prompt tests against bias/fairness datasets (like PII Leakage benchmarks).", "Record passed/failed tests with pass rates."],
              suggested_evidence: ["Dataset evaluation results database", "Pass/fail trend chart"],
              telemetry_sources: ["evaluation_results"],
              severity_weight: 8,
              depends_on_control: "GV-3.2"
            },
            {
              subcategory_code: "ME-2.2",
              title: "Disparate Impact Auditing",
              description: "Live runtime decisions are analyzed retrospectively to monitor outcome discrepancies.",
              implementation_examples: ["Query historic action log outcomes for distribution audits.", "Evaluate approval rates across user segments."],
              suggested_evidence: ["Historic audit logs analysis", "Disparate impact report"],
              telemetry_sources: ["interception_logs", "workflow_approvals"],
              severity_weight: 6,
              depends_on_control: null
            }
          ]
        },
        {
          category_code: "ME-3",
          title: "Security & Robustness Testing",
          description: "AI systems are tested for resilience against adversarial attacks, prompt injections, and system failures.",
          subcategories: [
            {
              subcategory_code: "ME-3.1",
              title: "Adversarial Robustness Testing",
              description: "Systems are subjected to automated jailbreak or prompt injection payloads to verify guardrail strength.",
              implementation_examples: ["Run scheduled jailbreak prompt attacks (like DAN or override patterns) against active agents.", "Enforce safety score calculations (0-100)."],
              suggested_evidence: ["Adversarial test reports", "Safety metrics evaluation"],
              telemetry_sources: ["evaluation_results"],
              severity_weight: 9,
              depends_on_control: null
            },
            {
              subcategory_code: "ME-3.2",
              title: "Fault Tolerance Resilience",
              description: "AI system behavior is validated under degraded networks, API drops, or database timeout conditions.",
              implementation_examples: ["Implement redundant API fallbacks in the action middleware.", "Verify safe fail-closed outcomes when connection drops."],
              suggested_evidence: ["API fallback specifications", "System recovery logs"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 8,
              depends_on_control: null
            }
          ]
        },
        {
          category_code: "ME-4",
          title: "Continuous Monitoring",
          description: "System behavior, output distributions, and agent operations are monitored in real-time.",
          subcategories: [
            {
              subcategory_code: "ME-4.1",
              title: "Behavioral Drift Detection",
              description: "Real-time action frequencies are compared against the agent's baseline to detect behavioral drift.",
              implementation_examples: ["Calculate the drift score dynamically based on active telemetry actions vs baseline.", "Create alert records when drift exceeds thresholds."],
              suggested_evidence: ["Behavioral drift database alert rows", "Automated drift scan logs"],
              telemetry_sources: ["drift_alerts"],
              severity_weight: 9,
              depends_on_control: "GV-1.2"
            },
            {
              subcategory_code: "ME-4.2",
              title: "Realtime Telemetry Ingestion",
              description: "Observable telemetry events are continuously parsed and processed by the compliance pipeline.",
              implementation_examples: ["Ensure interceptor logs feed continuously into governance tables.", "Audit telemetry freshness to ensure no monitoring gaps."],
              suggested_evidence: ["Telemetry queue configurations", "Observable health snapshots"],
              telemetry_sources: ["interception_logs", "drift_alerts"],
              severity_weight: 8,
              depends_on_control: "ME-4.1"
            }
          ]
        }
      ]
    },
    {
      function_code: "MANAGE",
      title: "Manage",
      description: "Respond to, escalate, and remediate AI system risks, maintaining incidents, SLAs, and continuous operational improvement.",
      categories: [
        {
          category_code: "MG-1",
          title: "Risk Response",
          description: "Risk treatment strategies are formulated, approved, and executed.",
          subcategories: [
            {
              subcategory_code: "MG-1.1",
              title: "Mitigation Strategy Approval",
              description: "Remediation action plans for flagged compliance gaps are formulated and reviewed.",
              implementation_examples: ["Create actionable fix tasks for identified framework gaps.", "Record administrator approvals on task plans."],
              suggested_evidence: ["Action plan database entries", "Governance approval signature logs"],
              telemetry_sources: ["workflow_approvals"],
              severity_weight: 7,
              depends_on_control: "GV-2.1"
            },
            {
              subcategory_code: "MG-1.2",
              title: "Active Guardrail Enforcements",
              description: "Dynamic guardrail rules are updated in the core interceptor to block active risk patterns.",
              implementation_examples: ["Configure dynamic keyword blocks on system prompts.", "Audit enforcement coverage parameters to ensure safety controls are online."],
              suggested_evidence: ["Guardrail configuration database settings", "Blocked outcomes history logs"],
              telemetry_sources: ["interception_logs"],
              severity_weight: 9,
              depends_on_control: null
            },
            {
              subcategory_code: "MG-1.3",
              title: "Compensating Controls Optimization",
              description: "Compensating controls are modeled and verified to reduce risk where primary controls fail.",
              implementation_examples: ["Enforce manual approval tasks when automated model evaluation fails.", "Record risk reduction offsets in posture logs."],
              suggested_evidence: ["Compensating control policy logs", "Risk reduction calculations"],
              telemetry_sources: ["workflow_approvals"],
              severity_weight: 6,
              depends_on_control: null
            }
          ]
        },
        {
          category_code: "MG-2",
          title: "Incident Response",
          description: "Systemic failures, drift cascades, and security incidents are cataloged, resolved, and reported.",
          subcategories: [
            {
              subcategory_code: "MG-2.1",
              title: "Incident Tracking & SLA Uptime",
              description: "Governance incidents are formally tracked with computed SLA deadlines.",
              implementation_examples: ["Create a governance incident record when severe drift or PII breaches occur.", "Track unresolved incident timers against 24h/72h SLA targets."],
              suggested_evidence: ["SOC Incident ledger entries", "SLA breach log summaries"],
              telemetry_sources: ["interception_logs", "drift_alerts"],
              severity_weight: 8,
              depends_on_control: "GV-5.2"
            },
            {
              subcategory_code: "MG-2.2",
              title: "Remediation & Incident Resolution",
              description: "Incidents are resolved with audit-stamped comments and resolution reports.",
              implementation_examples: ["Stipulate incident resolution descriptions in the SOC log.", "Calculate recovery factor multi-day delays upon resolution."],
              suggested_evidence: ["Incident resolution report", "Progressive posture recovery log"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 8,
              depends_on_control: "MG-2.1"
            }
          ]
        },
        {
          category_code: "MG-3",
          title: "Governance Escalation",
          description: "Severe compliance breaches are escalated to appropriate authorities and boards.",
          subcategories: [
            {
              subcategory_code: "MG-3.1",
              title: "Executive Board Notifications",
              description: "Breach notifications are generated and delivered to designated compliance emails or webhooks.",
              implementation_examples: ["Deliver high-severity drift alerts to designated compliance emails.", "Send instant notifications to integrated Slack channels."],
              suggested_evidence: ["SMTP notification records", "Slack integration webhook payloads"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 7,
              depends_on_control: null
            },
            {
              subcategory_code: "MG-3.2",
              title: "Regulator Conformity Packaging",
              description: "Conformity packages and Signed Audit reports are structured for external regulators.",
              implementation_examples: ["Package historical incident and evidence snapshots with cryptographic HMAC hashes.", "Allow auditors to download conformity packages."],
              suggested_evidence: ["Conformity export package zip", "Verification logs list"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 8,
              depends_on_control: null
            }
          ]
        },
        {
          category_code: "MG-4",
          title: "Continuous Improvement",
          description: "System governance is updated continuously based on incident reviews and posture tracking.",
          subcategories: [
            {
              subcategory_code: "MG-4.1",
              title: "Historical Snapshot Review",
              description: "Compliance trends and historical posture snapshots are reviewed periodically.",
              implementation_examples: ["Store weekly compliance snapshot history database records.", "Review score recovery loops."],
              suggested_evidence: ["Historic snapshot dashboard chart", "Governance posture snapshot logs"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 6,
              depends_on_control: null
            },
            {
              subcategory_code: "MG-4.2",
              title: "Platform Abuse Protections",
              description: "Telemetry ingestion is monitored for rate-limit manipulation or inflated evidence.",
              implementation_examples: ["Log abnormal telemetry frequencies.", "Reduce evidence confidence factors on rate cap breaches."],
              suggested_evidence: ["Rate cap policy rules", "Suspicious activity logs"],
              telemetry_sources: ["audit_logs"],
              severity_weight: 5,
              depends_on_control: null
            }
          ]
        }
      ]
    }
  ],
  frameworkMappings: [
    { source_control_code: "ME-4.1", target_framework: "EU_AI_ACT", target_control_code: "EU-AIA-15-2", mapping_strength: 0.9 },
    { source_control_code: "GV-2.1", target_framework: "EU_AI_ACT", target_control_code: "EU-AIA-14-1", mapping_strength: 1.0 },
    { source_control_code: "GV-2.1", target_framework: "EU_AI_ACT", target_control_code: "EU-AIA-14-2", mapping_strength: 0.8 },
    { source_control_code: "GV-5.1", target_framework: "EU_AI_ACT", target_control_code: "EU-AIA-10-3", mapping_strength: 0.95 },
    { source_control_code: "GV-5.1", target_framework: "GDPR", target_control_code: "GDPR-Art-32", mapping_strength: 0.9 },
    { source_control_code: "MG-2.1", target_framework: "EU_AI_ACT", target_control_code: "EU-AIA-72-2", mapping_strength: 0.85 },
    { source_control_code: "MP-2.1", target_framework: "EU_AI_ACT", target_control_code: "EU-AIA-9-1", mapping_strength: 0.9 }
  ]
};

/**
 * Idempotently seeds NIST AI RMF 1.0 functions, categories, subcategories, and framework mappings.
 * Utilizes upserts to ensure safety during concurrent starts (such as multi-instance Kubernetes deployments).
 */
export async function seedNistAiRmf(prisma: any) {
  logger.info("🌱 NIST AI RMF 1.0: Seeding started...");

  let functionCount = 0;
  let categoryCount = 0;
  let subcategoryCount = 0;
  let mappingCount = 0;

  for (const fn of NIST_AI_RMF_SEED_DATA.functions) {
    // 1. Idempotent Upsert of Functions
    const functionRow = await prisma.nist_ai_rmf_functions.upsert({
      where: { function_code: fn.function_code },
      update: {
        title: fn.title,
        description: fn.description
      },
      create: {
        function_code: fn.function_code,
        title: fn.title,
        description: fn.description
      }
    });
    functionCount++;

    for (const cat of fn.categories) {
      // 2. Idempotent Upsert of Categories
      const categoryRow = await prisma.nist_ai_rmf_categories.upsert({
        where: { category_code: cat.category_code },
        update: {
          title: cat.title,
          description: cat.description,
          function_id: functionRow.id
        },
        create: {
          category_code: cat.category_code,
          title: cat.title,
          description: cat.description,
          function_id: functionRow.id
        }
      });
      categoryCount++;

      for (const sub of cat.subcategories) {
        // 3. Idempotent Upsert of Subcategories
        await prisma.nist_ai_rmf_subcategories.upsert({
          where: { subcategory_code: sub.subcategory_code },
          update: {
            title: sub.title,
            description: sub.description,
            implementation_examples: sub.implementation_examples,
            suggested_evidence: sub.suggested_evidence,
            telemetry_sources: sub.telemetry_sources,
            severity_weight: sub.severity_weight,
            depends_on_control: sub.depends_on_control,
            category_id: categoryRow.id
          },
          create: {
            subcategory_code: sub.subcategory_code,
            title: sub.title,
            description: sub.description,
            implementation_examples: sub.implementation_examples,
            suggested_evidence: sub.suggested_evidence,
            telemetry_sources: sub.telemetry_sources,
            severity_weight: sub.severity_weight,
            depends_on_control: sub.depends_on_control,
            category_id: categoryRow.id
          }
        });
        subcategoryCount++;
      }
    }
  }

  // 4. Idempotent Upsert of Framework Mappings
  for (const map of NIST_AI_RMF_SEED_DATA.frameworkMappings) {
    const existing = await prisma.framework_control_mappings.findFirst({
      where: {
        source_framework: "NIST_AI_RMF",
        source_control_code: map.source_control_code,
        target_framework: map.target_framework,
        target_control_code: map.target_control_code
      }
    });

    if (existing) {
      await prisma.framework_control_mappings.update({
        where: { id: existing.id },
        data: { mapping_strength: map.mapping_strength }
      });
    } else {
      await prisma.framework_control_mappings.create({
        data: {
          source_framework: "NIST_AI_RMF",
          source_control_code: map.source_control_code,
          target_framework: map.target_framework,
          target_control_code: map.target_control_code,
          mapping_strength: map.mapping_strength
        }
      });
    }
    mappingCount++;
  }

  logger.info(`✅ NIST AI RMF 1.0 Seeding Completed: seeded ${functionCount} functions, ${categoryCount} categories, ${subcategoryCount} subcategories, and ${mappingCount} cross-framework mappings.`);
}

import logger from '../utils/logger';

export interface IsoClauseSeedInput {
  clause_code: string;
  title: string;
  description: string;
  clause_type: 'CLAUSE' | 'ANNEX';
}

export interface IsoControlSeedInput {
  clause_code: string;
  control_code: string;
  title: string;
  description: string;
  evidence_required: string[];
  checklist_items: string[];
}

export const ISO42001_CLAUSES: IsoClauseSeedInput[] = [
  // Clauses 4-10
  { clause_code: 'Clause 4', title: 'Context of the organization', description: 'Understanding the organization and its context, needs, and expectations of interested parties, and determining the scope of the AI management system.', clause_type: 'CLAUSE' },
  { clause_code: 'Clause 5', title: 'Leadership', description: 'Leadership and commitment, AI policy, and organizational roles, responsibilities, and authorities.', clause_type: 'CLAUSE' },
  { clause_code: 'Clause 6', title: 'Planning', description: 'Actions to address risks and opportunities, and AI objectives and planning to achieve them.', clause_type: 'CLAUSE' },
  { clause_code: 'Clause 7', title: 'Support', description: 'Resources, competence, awareness, communication, and documented information required for the AI system.', clause_type: 'CLAUSE' },
  { clause_code: 'Clause 8', title: 'Operation', description: 'Operational planning and control, AI risk assessment, and operational AI risk treatment.', clause_type: 'CLAUSE' },
  { clause_code: 'Clause 9', title: 'Performance evaluation', description: 'Monitoring, measurement, analysis, evaluation, internal audit, and management review.', clause_type: 'CLAUSE' },
  { clause_code: 'Clause 10', title: 'Improvement', description: 'Nonconformity, corrective action, and continual improvement of the AI system.', clause_type: 'CLAUSE' },

  // Annex A Categories A5-A13
  { clause_code: 'Annex A5', title: 'Policies related to AI', description: 'Policies related to the development, deployment, and use of AI systems.', clause_type: 'ANNEX' },
  { clause_code: 'Annex A6', title: 'Internal organization', description: 'Internal governance structure, roles, and accountability for AI safety.', clause_type: 'ANNEX' },
  { clause_code: 'Annex A7', title: 'Resources for AI systems', description: 'Allocation of human, data, infrastructure, and technical resources.', clause_type: 'ANNEX' },
  { clause_code: 'Annex A8', title: 'Assessing impacts of AI systems', description: 'Assessing impacts on individuals, groups, and society.', clause_type: 'ANNEX' },
  { clause_code: 'Annex A9', title: 'AI system life cycle', description: 'Controls across design, development, deployment, operation, and decommissioning.', clause_type: 'ANNEX' },
  { clause_code: 'Annex A10', title: 'Data for AI systems', description: 'Data provenance, quality, governance, and privacy protection.', clause_type: 'ANNEX' },
  { clause_code: 'Annex A11', title: 'Information for interested parties', description: 'Transparency, user documentation, and reporting mechanisms.', clause_type: 'ANNEX' },
  { clause_code: 'Annex A12', title: 'Use of AI systems', description: 'Appropriate use, incident monitoring, and human oversight.', clause_type: 'ANNEX' },
  { clause_code: 'Annex A13', title: 'Third-party relationships', description: 'Supply chain security, vendor risk, and third-party AI compliance.', clause_type: 'ANNEX' },
];

export const ISO42001_CONTROLS: IsoControlSeedInput[] = [
  // Clause 4 Controls (3 controls)
  { clause_code: 'Clause 4', control_code: 'ISO-42001-4-1', title: 'Understanding Organization Context', description: 'Analyze internal and external factors influencing AI development and deployment.', evidence_required: ['Context Analysis Document', 'Stakeholder Requirements List'], checklist_items: ['Identify key business objectives for AI', 'Assess legal/regulatory landscape', 'Map key external partners'] },
  { clause_code: 'Clause 4', control_code: 'ISO-42001-4-2', title: 'Interested Parties Identification', description: 'Identify expectations of users, customers, regulators, and affected populations.', evidence_required: ['Stakeholder Engagement Logs', 'Needs Review Report'], checklist_items: ['Identify primary users of AI systems', 'Define criteria for user feedback', 'Conduct impact scoping sessions'] },
  { clause_code: 'Clause 4', control_code: 'ISO-42001-4-3', title: 'AIMS Scope Determination', description: 'Define boundaries and applicability of the AI Management System.', evidence_required: ['AIMS Scope Statement', 'System Inventory Log'], checklist_items: ['Draft formal AIMS boundaries', 'Include/exclude specific systems with rationale', 'Publish scope document internally'] },

  // Clause 5 Controls (3 controls)
  { clause_code: 'Clause 5', control_code: 'ISO-42001-5-1', title: 'Management Commitment', description: 'Demonstrate leadership commitment to AI trustworthiness and compliance.', evidence_required: ['Executive Committee Charters', 'Budget Allocations for AI Compliance'], checklist_items: ['Establish executive AI oversight board', 'Approve annual AI compliance roadmap', 'Allocate specific budget for security audits'] },
  { clause_code: 'Clause 5', control_code: 'ISO-42001-5-2', title: 'AI Policy Alignment', description: 'Draft and publish an organization-wide policy governing AI development and use.', evidence_required: ['AI Governance Policy', 'Employee Policy Sign-off'], checklist_items: ['Draft standard AI ethics guidelines', 'Integrate policy into employee onboarding', 'Schedule annual policy review sessions'] },
  { clause_code: 'Clause 5', control_code: 'ISO-42001-5-3', title: 'Roles & Responsibilities Assignment', description: 'Assign clear governance roles, including AI Safety Officers and stewards.', evidence_required: ['Organizational Chart', 'Role Definition Documents'], checklist_items: ['Appoint AI Safety Officer', 'Define data steward responsibilities', 'Set up escalation pathways for AI anomalies'] },

  // Clause 6 Controls (3 controls)
  { clause_code: 'Clause 6', control_code: 'ISO-42001-6-1', title: 'Risk Scoping & Identification', description: 'Identify risks related to bias, safety, privacy, and security in AI.', evidence_required: ['AI Risk Register', 'Risk Assessment Methodology'], checklist_items: ['Run threat modeling for active models', 'Log identified risks into central register', 'Assess risk probability and business impact'] },
  { clause_code: 'Clause 6', control_code: 'ISO-42001-6-2', title: 'Risk Treatment Plan', description: 'Formulate mitigation plans and technical controls for mapped risks.', evidence_required: ['Risk Treatment Roadmap', 'Mitigation Control Specs'], checklist_items: ['Assign mitigations to specific engineering teams', 'Set up control validation rules', 'Review risk posture changes quarterly'] },
  { clause_code: 'Clause 6', control_code: 'ISO-42001-6-3', title: 'AI System Objectives', description: 'Establish measurable quality, robustness, and fairness objectives.', evidence_required: ['Model Performance Benchmarks', 'Quality KPI Dashboard'], checklist_items: ['Define accuracy and drift thresholds', 'Establish fairness metric metrics', 'Align objectives with regulatory requirements'] },

  // Clause 7 Controls (3 controls)
  { clause_code: 'Clause 7', control_code: 'ISO-42001-7-1', title: 'Resource Provisioning', description: 'Ensure adequate human, data, and compute resources are allocated securely.', evidence_required: ['Resource Planning Report', 'Infrastructure Spec Docs'], checklist_items: ['Assess developer training needs', 'Secure necessary training compute pipelines', 'Audit data hosting capacity'] },
  { clause_code: 'Clause 7', control_code: 'ISO-42001-7-2', title: 'Staff Competence & Training', description: 'Ensure AI developers and operators have adequate training on AI safety.', evidence_required: ['Training Logs', 'Certificate Registry'], checklist_items: ['Deliver bias detection training to developers', 'Run AI security awareness sessions', 'Document staff credentials'] },
  { clause_code: 'Clause 7', control_code: 'ISO-42001-7-3', title: 'Documented Information Control', description: 'Manage documents detailing system design, training datasets, and logs.', evidence_required: ['Doc Version History', 'Access Authorization Logs'], checklist_items: ['Set up secure doc repository', 'Enforce strict version control', 'Log all documentation access attempts'] },

  // Clause 8 Controls (3 controls)
  { clause_code: 'Clause 8', control_code: 'ISO-42001-8-1', title: 'Operational Planning Controls', description: 'Implement operational controls to meet system quality and safety criteria.', evidence_required: ['Operational Procedure Docs', 'Release Readiness Checklists'], checklist_items: ['Enforce peer-review on production models', 'Standardize release gating procedures', 'Automate pipeline health monitoring'] },
  { clause_code: 'Clause 8', control_code: 'ISO-42001-8-2', title: 'System Modification Control', description: 'Manage modifications and retraining loops of production models.', evidence_required: ['Retraining Policy', 'Change Management Logs'], checklist_items: ['Validate performance of retrained models', 'Record exact model versions in production', 'Establish rollback plans'] },
  { clause_code: 'Clause 8', control_code: 'ISO-42001-8-3', title: 'Anomalous Event Detection', description: 'Monitor operational parameters to detect and flag unexpected behavior.', evidence_required: ['Anomaly Alert Logs', 'Incident Management Guide'], checklist_items: ['Deploy real-time input validators', 'Set up operational metric alerts', 'Draft anomaly triage playbooks'] },

  // Clause 9 Controls (3 controls)
  { clause_code: 'Clause 9', control_code: 'ISO-42001-9-1', title: 'Monitoring & Performance Evaluation', description: 'Continuously measure operational model metrics and accuracy.', evidence_required: ['Performance Evaluation Reports', 'Telemetry Dashboards'], checklist_items: ['Track drift indices automatically', 'Evaluate accuracy against live validation sets', 'Analyze user feedback signals'] },
  { clause_code: 'Clause 9', control_code: 'ISO-42001-9-2', title: 'Internal AIMS Auditing', description: 'Conduct planned internal audits to verify AIMS effectiveness.', evidence_required: ['Internal Audit Reports', 'Audit Action Plans'], checklist_items: ['Schedule independent audit sessions', 'Review compliance of active controllers', 'Document nonconformities'] },
  { clause_code: 'Clause 9', control_code: 'ISO-42001-9-3', title: 'Management Review Output', description: 'Provide AI governance reports and scores to executive management.', evidence_required: ['Management Review Meeting Minutes', 'Executive Governance Scores'], checklist_items: ['Summarize audit findings for leadership', 'Highlight system incidents and treatment progress', 'Recommend budget and policy adjustments'] },

  // Clause 10 Controls (3 controls)
  { clause_code: 'Clause 10', control_code: 'ISO-42001-10-1', title: 'Corrective Action Triage', description: 'React to nonconformities and implement root-cause fixes.', evidence_required: ['Triage Log Reports', 'Corrective Action Plan'], checklist_items: ['Triage compliance breaches within SLAs', 'Identify engineering root causes', 'Implement permanent system patches'] },
  { clause_code: 'Clause 10', control_code: 'ISO-42001-10-2', title: 'Continual AIMS Improvement', description: 'Continuously refine security, privacy, and efficiency measures of AI.', evidence_required: ['Optimization Project Records', 'Upgrade History'], checklist_items: ['Integrate advanced telemetry plugins', 'Adopt best-practice risk scanners', 'Optimize evaluation turnaround speeds'] },
  { clause_code: 'Clause 10', control_code: 'ISO-42001-10-3', title: 'Policy & Objective Optimization', description: 'Re-evaluate policies and objectives in response to environment shifts.', evidence_required: ['Policy Update Log', 'Optimized KPI Statements'], checklist_items: ['Update risk scoring factors post-audits', 'Refine performance objectives yearly', 'Publish optimized guidelines'] },

  // Annex A5 Controls (3 controls)
  { clause_code: 'Annex A5', control_code: 'ISO-42001-A5-1', title: 'AI Security Policy Development', description: 'Develop targeted security policies matching the operational traits of AI.', evidence_required: ['AI Security Standards Manual'], checklist_items: ['Identify AI-specific threat vectors', 'Define training data protection rules', 'Establish model access control layers'] },
  { clause_code: 'Annex A5', control_code: 'ISO-42001-A5-2', title: 'Responsible AI Guidelines', description: 'Adopt clear rules outlining dignity, rights, and transparency principles.', evidence_required: ['Responsible AI Guidelines Booklet'], checklist_items: ['Prohibit harmful psychological manipulation', 'Ensure human dignity respect standard', 'Enforce explainability principles'] },
  { clause_code: 'Annex A5', control_code: 'ISO-42001-A5-3', title: 'Policy Distribution & Updates', description: 'Ensure policies are regularly communicated to teams and updated.', evidence_required: ['Communication Logs', 'Policy Version History'], checklist_items: ['Conduct policy alignment webinars', 'Host Q&A sessions for engineering team', 'Review guidelines against new regulations'] },

  // Annex A6 Controls (3 controls)
  { clause_code: 'Annex A6', control_code: 'ISO-42001-A6-1', title: 'Ethical Oversight Board', description: 'Provide structured ethical review for new and high-risk AI systems.', evidence_required: ['Board Charter', 'System Review Approvals'], checklist_items: ['Establish multi-disciplinary review committee', 'Review systems before operationalizing', 'Audit model outputs for ethical compliance'] },
  { clause_code: 'Annex A6', control_code: 'ISO-42001-A6-2', title: 'Whistleblower Escalation Pathway', description: 'Establish safe pathways for employees to flag AI safety and ethical concerns.', evidence_required: ['Whistleblower Portal Logs', 'Incident Triage Records'], checklist_items: ['Launch anonymous report intake forms', 'Commit to protection from retaliation', 'Triage flags within 48-hour window'] },
  { clause_code: 'Annex A6', control_code: 'ISO-42001-A6-3', title: 'Regulatory Liaison Structure', description: 'Organize formal communications and reporting channels with AI regulators.', evidence_required: ['Regulatory Communications Ledger'], checklist_items: ['Identify key compliance reporting deadlines', 'Prepare conformity assessment portfolios', 'Log all regulatory exchanges'] },

  // Annex A7 Controls (3 controls)
  { clause_code: 'Annex A7', control_code: 'ISO-42001-A7-1', title: 'Compute Infrastructure Security', description: 'Secure GPU nodes, orchestration environments, and staging compute.', evidence_required: ['Cluster Configuration Specs', 'Penetration Test Reports'], checklist_items: ['Enforce network isolation on GPU clusters', 'Regularly patch base images', 'Scan docker containers for vulnerabilities'] },
  { clause_code: 'Annex A7', control_code: 'ISO-42001-A7-2', title: 'Data Pipeline Allocation', description: 'Set up isolated, encrypted storage for active data pipelines.', evidence_required: ['Encrypted Pipeline Specs', 'KMS Key Configs'], checklist_items: ['Encrypt all storage volumes at rest', 'Enforce transit encryption via TLS 1.3', 'Manage data keys using HSMs'] },
  { clause_code: 'Annex A7', control_code: 'ISO-42001-A7-3', title: 'Governance Staff Allocation', description: 'Allocate dedicated compliance engineers and data protection staff.', evidence_required: ['Resource Allocation Table'], checklist_items: ['Define compliance headcount requirements', 'Recruit certified AI risk practitioners', 'Ensure team availability for active audits'] },

  // Annex A8 Controls (3 controls)
  { clause_code: 'Annex A8', control_code: 'ISO-42001-A8-1', title: 'Fundamental Rights Impact Analysis', description: 'Conduct systematic assessments of impacts on fundamental civil rights.', evidence_required: ['FRIA Reports Archive', 'Impact Evaluation Framework'], checklist_items: ['Map affected populations demographics', 'Evaluate non-discrimination risks', 'Assess rights to privacy and fair trial'] },
  { clause_code: 'Annex A8', control_code: 'ISO-42001-A8-2', title: 'Social & Environmental Scopes', description: 'Analyze potential environmental impact (compute footprint) and social bias.', evidence_required: ['Environmental Impact Reports', 'Compute Footprint Log'], checklist_items: ['Estimate carbon emissions of training cycles', 'Track system energy efficiency', 'Document societal bias concerns'] },
  { clause_code: 'Annex A8', control_code: 'ISO-42001-A8-3', title: 'DPIA Integration', description: 'Coordinate Data Protection Impact Assessments with AI risk matrices.', evidence_required: ['DPIA Sign-off Certificates'], checklist_items: ['Identify high-risk data processing triggers', 'Coordinate with Data Protection Officer', 'Record mitigations in DPIA logs'] },

  // Annex A9 Controls (3 controls)
  { clause_code: 'Annex A9', control_code: 'ISO-42001-A9-1', title: 'Life Cycle Phase Mapping', description: 'Structure model progression across design, coding, testing, and operation.', evidence_required: ['Life Cycle Phase Playbook', 'Staging Gate Reports'], checklist_items: ['Adopt standardized system SDLC', 'Enforce sign-off gates between phases', 'Verify training data lineage'] },
  { clause_code: 'Annex A9', control_code: 'ISO-42001-A9-2', title: 'Verification & Validation Pipeline', description: 'Run standardized automated tests to evaluate model robustness.', evidence_required: ['Test Case Suite', 'V&V Test Run Output'], checklist_items: ['Run threat modeling scans', 'Verify performance under noisy inputs', 'Run regression validations against baselines'] },
  { clause_code: 'Annex A9', control_code: 'ISO-42001-A9-3', title: 'Decommissioning Procedures', description: 'Safely decommission stale models and securely purge associated data.', evidence_required: ['Decommissioning Logs', 'Data Purge Certificates'], checklist_items: ['Archive model binaries and weights safely', 'Revoke API endpoints access controls', 'Purge local cache data securely'] },

  // Annex A10 Controls (3 controls)
  { clause_code: 'Annex A10', control_code: 'ISO-42001-A10-1', title: 'Data Provenance Mapping', description: 'Map data origin, licensing, and processing lineage.', evidence_required: ['Data Provenance Map', 'License Audit Registry'], checklist_items: ['Verify license compliance of training sets', 'Map pipeline extraction nodes', 'Identify open-source data risks'] },
  { clause_code: 'Annex A10', control_code: 'ISO-42001-A10-2', title: 'Data Quality & Bias Audits', description: 'Analyze data representing demographics for structural skew or bias.', evidence_required: ['Bias Evaluation Report', 'Data Balance Stats'], checklist_items: ['Run balance checks on category distribution', 'Filter training sets for toxic content', 'Validate data completeness'] },
  { clause_code: 'Annex A10', control_code: 'ISO-42001-A10-3', title: 'Privacy Enhancing Technologies', description: 'Deploy data anonymization, masking, and differential privacy limits.', evidence_required: ['PET Specification Document', 'PII Scanner Logs'], checklist_items: ['Mask direct PII in training sets', 'Encrypt training data pipelines', 'Run automated PII scanners'] },

  // Annex A11 Controls (3 controls)
  { clause_code: 'Annex A11', control_code: 'ISO-42001-A11-1', title: 'User Transparency & Disclosure', description: 'Notify users clearly when they are interacting directly with an AI.', evidence_required: ['UX Copy Screenshots', 'Disclosure Log Records'], checklist_items: ['Deploy direct chat disclosures', 'Expose system scope limitations', 'Publish model specifications summary'] },
  { clause_code: 'Annex A11', control_code: 'ISO-42001-A11-2', title: 'Technical Documentation Quality', description: 'Maintain highly granular technical system manuals for auditors.', evidence_required: ['System Technical Architecture Manual'], checklist_items: ['Describe neural architecture details', 'Log hyperparameter configurations', 'Document hardware environment configurations'] },
  { clause_code: 'Annex A11', control_code: 'ISO-42001-A11-3', title: 'Explainability & Redress Mechanisms', description: 'Expose explanations for AI decisions and provide pathways for recourse.', evidence_required: ['Explainability Specs', 'Redress Intake Ledgers'], checklist_items: ['Expose key feature weights to users', 'Launch appeal submission forms', 'Triage redress cases manually'] },

  // Annex A12 Controls (3 controls)
  { clause_code: 'Annex A12', control_code: 'ISO-42001-A12-1', title: 'Acceptable Use Governance', description: 'Publish and enforce policies prohibiting malicious system operations.', evidence_required: ['Acceptable Use Policy Agreement'], checklist_items: ['Publish Acceptable Use Policy guidelines', 'Block unauthorized API credentials', 'Scan queries for system abuse patterns'] },
  { clause_code: 'Annex A12', control_code: 'ISO-42001-A12-2', title: 'Real-time Guardrails & Enforcement', description: 'Deploy real-time scanners enforcing acceptable input/output ranges.', evidence_required: ['Guardrail Config Specs', 'Interception Violations Report'], checklist_items: ['Configure real-time prompt scanners', 'Deploy PII interceptors', 'Log all policy enforcement events'] },
  { clause_code: 'Annex A12', control_code: 'ISO-42001-A12-3', title: 'Human Oversight Systems', description: 'Integrate systematic Human-in-the-loop review layers for high-risk decisions.', evidence_required: ['Oversight Workflows Spec', 'HITL Audit Trails'], checklist_items: ['Route high-risk decisions to human queues', 'Track human override ratios', 'Review model feedback loops'] },

  // Annex A13 Controls (3 controls)
  { clause_code: 'Annex A13', control_code: 'ISO-42001-A13-1', title: 'Vendor Security Assessments', description: 'Conduct pre-acquisition security reviews of external models.', evidence_required: ['Vendor Assessment Archive', 'API Vulnerability Reports'], checklist_items: ['Audit vendor model card performance metrics', 'Request vendor compliance certificates', 'Evaluate data access scopes'] },
  { clause_code: 'Annex A13', control_code: 'ISO-42001-A13-2', title: 'Third-party SLA Tracking', description: 'Track vendor model SLA uptimes, deprecations, and privacy commitments.', evidence_required: ['SLA Metric Ledger', 'Contractual Data Clauses'], checklist_items: ['Track API latency and downtime', 'Incorporate data privacy clauses in contracts', 'Evaluate vendor model retraining frequencies'] },
  { clause_code: 'Annex A13', control_code: 'ISO-42001-A13-3', title: 'Supply Chain Component Mapping', description: 'Identify and map dependency trees of models and datasets.', evidence_required: ['AI Supply Chain Directory', 'SBOM Document'], checklist_items: ['Track training library versions', 'Map host server physical regions', 'Audit third-party training datasets'] },
];

export async function seedIso42001(prisma: any): Promise<void> {
  logger.info('🌱 Seeding ISO 42001 global framework (Clauses & Controls)...');
  let clauseCount = 0;
  let controlCount = 0;

  for (const clauseData of ISO42001_CLAUSES) {
    const clause = await prisma.iso42001_clauses.upsert({
      where: { clause_code: clauseData.clause_code },
      update: {
        title: clauseData.title,
        description: clauseData.description,
        clause_type: clauseData.clause_type,
      },
      create: {
        clause_code: clauseData.clause_code,
        title: clauseData.title,
        description: clauseData.description,
        clause_type: clauseData.clause_type,
        is_active: true,
      },
    });
    clauseCount++;

    const relatedControls = ISO42001_CONTROLS.filter(c => c.clause_code === clauseData.clause_code);
    for (const ctrlData of relatedControls) {
      await prisma.iso42001_controls.upsert({
        where: { control_code: ctrlData.control_code },
        update: {
          clause_id: clause.id,
          title: ctrlData.title,
          description: ctrlData.description,
          evidence_required: ctrlData.evidence_required,
          checklist_items: ctrlData.checklist_items,
        },
        create: {
          clause_id: clause.id,
          control_code: ctrlData.control_code,
          title: ctrlData.title,
          description: ctrlData.description,
          evidence_required: ctrlData.evidence_required,
          checklist_items: ctrlData.checklist_items,
        },
      });
      controlCount++;
    }
  }

  logger.info(`✅ ISO 42001 Seeding Completed: seeded ${clauseCount} clauses, ${controlCount} controls.`);
}

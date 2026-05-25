import logger from '../utils/logger';

export interface Iso27001ClauseSeedInput {
  clause_code: string;
  title: string;
  description: string;
}

export interface Iso27001ControlSeedInput {
  clause_code: string;
  control_code: string;
  title: string;
  description: string;
  evidence_required: string[];
  checklist_items: string[];
}

export const ISO27001_CLAUSES: Iso27001ClauseSeedInput[] = [
  // Clauses 4-10
  { clause_code: 'Clause 4', title: 'Context of the organization', description: 'Understanding the organization and its context, needs/expectations of interested parties, and the scope of the Information Security Management System (ISMS).'},
  { clause_code: 'Clause 5', title: 'Leadership', description: 'Leadership commitment, information security policy, and organizational roles, responsibilities, and authorities.'},
  { clause_code: 'Clause 6', title: 'Planning', description: 'Actions to address information security risks and opportunities, risk treatment plans, and objectives.'},
  { clause_code: 'Clause 7', title: 'Support', description: 'Resources, competence, awareness, communication, and documented information control.'},
  { clause_code: 'Clause 8', title: 'Operation', description: 'Operational planning and control, information security risk assessment, and treatment.'},
  { clause_code: 'Clause 9', title: 'Performance evaluation', description: 'Monitoring, measurement, analysis, evaluation, internal audit, and management reviews.'},
  { clause_code: 'Clause 10', title: 'Improvement', description: 'Corrective action, nonconformity management, and continual improvement.'},

  // Annex A Themes (4 themes in 2022 version)
  { clause_code: 'Annex A5', title: 'Organizational controls', description: 'Policies, governance, asset management, and third-party security.'},
  { clause_code: 'Annex A6', title: 'People controls', description: 'Screening, training, non-disclosure, and remote working guidelines.'},
  { clause_code: 'Annex A7', title: 'Physical controls', description: 'Secure areas, entry controls, equipment security, and media disposal.'},
  { clause_code: 'Annex A8', title: 'Technological controls', description: 'Endpoint security, network protection, secure coding, cryptography, and logging.'},
];

export const ISO27001_CONTROLS: Iso27001ControlSeedInput[] = [
  // Clause 4 Controls (3 controls)
  { clause_code: 'Clause 4', control_code: 'ISO-27001-4-1', title: 'ISMS Internal & External Analysis', description: 'Identify and analyze factors impacting corporate information security objectives.', evidence_required: ['ISMS Context Review Report'], checklist_items: ['Identify key asset groups', 'Review regulatory security obligations', 'Document commercial security requirements'] },
  { clause_code: 'Clause 4', control_code: 'ISO-27001-4-2', title: 'Security Stakeholder Needs Mapping', description: 'Map security requirements of customers, employees, and regulators.', evidence_required: ['Stakeholder Security Review Matrix'], checklist_items: ['List key customer security commitments', 'Track compliance reporting cycles', 'Review privacy expectations'] },
  { clause_code: 'Clause 4', control_code: 'ISO-27001-4-3', title: 'ISMS Scope Publication', description: 'Define and document the boundaries of the corporate ISMS.', evidence_required: ['ISMS Scope Statement Document'], checklist_items: ['Draft boundaries statement', 'Review staging/production exclusions', 'Publish scope to corporate portal'] },

  // Clause 5 Controls (3 controls)
  { clause_code: 'Clause 5', control_code: 'ISO-27001-5-1', title: 'Security Leadership Alignment', description: 'Establish executive alignment and active commitment to information security.', evidence_required: ['CISO Charter', 'Executive Committee Briefs'], checklist_items: ['Appoint corporate CISO', 'Host bi-annual security review board meetings', 'Approve annual security budgets'] },
  { clause_code: 'Clause 5', control_code: 'ISO-27001-5-2', title: 'Information Security Policy Management', description: 'Draft, publish, and distribute corporate-wide security guidelines.', evidence_required: ['Information Security Policy (ISP)'], checklist_items: ['Draft Core Information Security Policy', 'Deliver policy notifications to staff', 'Audit sign-offs annually'] },
  { clause_code: 'Clause 5', control_code: 'ISO-27001-5-3', title: 'Roles & Security Responsibilities', description: 'Assign ownership for data asset groups and technical domains.', evidence_required: ['Security Responsibilities Chart'], checklist_items: ['Define Asset Owner roles', 'Assign network security domains', 'Formulate security response ownerships'] },

  // Clause 6 Controls (3 controls)
  { clause_code: 'Clause 6', control_code: 'ISO-27001-6-1', title: 'Security Risk Register', description: 'Track security risks and catalog them in a central ledger.', evidence_required: ['ISMS Risk Assessment Log'], checklist_items: ['Identify information threats and vulnerabilities', 'Estimate risk impacts and likelihood', 'Assign risks to designated owners'] },
  { clause_code: 'Clause 6', control_code: 'ISO-27001-6-2', title: 'Risk Treatment Selection', description: 'Select appropriate treatments (mitigate, accept, transfer, avoid) for identified risks.', evidence_required: ['Risk Treatment Plan (RTP)'], checklist_items: ['Map risks to Annex A controls', 'Draft specific mitigation roadmaps', 'Approve risk-retention exclusions'] },
  { clause_code: 'Clause 6', control_code: 'ISO-27001-6-3', title: 'Security Objective Metrics', description: 'Define clear, measurable goals for data privacy and network uptime.', evidence_required: ['Security Objectives Statements'], checklist_items: ['Define corporate SLA targets', 'Specify system patch-cycle SLAs', 'Set acceptable training session limits'] },

  // Clause 7 Controls (3 controls)
  { clause_code: 'Clause 7', control_code: 'ISO-27001-7-1', title: 'Security Competence Framework', description: 'Verify staff competencies and deliver targeted security training.', evidence_required: ['Training Logs', 'Security Certification Registry'], checklist_items: ['Deliver secure development training to engineers', 'Conduct annual security training for all staff', 'Assess competence gaps yearly'] },
  { clause_code: 'Clause 7', control_code: 'ISO-27001-7-2', title: 'ISMS Awareness Campaigns', description: 'Promote continuous security awareness and threat vigilance.', evidence_required: ['Phishing Drill Performance Reports'], checklist_items: ['Conduct simulated phishing drills', 'Publish monthly security newsletters', 'Train staff on social engineering risks'] },
  { clause_code: 'Clause 7', control_code: 'ISO-27001-7-3', title: 'Document Control Integrity', description: 'Maintain version integrity and secure storage of documentation.', evidence_required: ['ISMS Doc Version Index'], checklist_items: ['Store records in encrypted environments', 'Configure strict review cycles', 'Enforce change-log auditing'] },

  // Clause 8 Controls (3 controls)
  { clause_code: 'Clause 8', control_code: 'ISO-27001-8-1', title: 'Operational Security Controls', description: 'Execute security actions to achieve specified security objectives.', evidence_required: ['Operational Security Specs', 'Production Gate Reports'], checklist_items: ['Enforce peer review on codebase changes', 'Validate firewalls rules periodically', 'Audit change compliance logs'] },
  { clause_code: 'Clause 8', control_code: 'ISO-27001-8-2', title: 'Information Security Risk Scans', description: 'Execute scheduled threat assessments across production infrastructure.', evidence_required: ['Vulnerability Scan Reports'], checklist_items: ['Run automated package dependency scans', 'Perform network port checks monthly', 'Review staging configs against baseline'] },
  { clause_code: 'Clause 8', control_code: 'ISO-27001-8-3', title: 'Risk Treatment Execution', description: 'Deploy technical controls to mitigate flagged operational threats.', evidence_required: ['Remediation Task Logs'], checklist_items: ['Deploy priority security patches', 'Isolate vulnerable virtual instances', 'Review treatment resolution times'] },

  // Clause 9 Controls (3 controls)
  { clause_code: 'Clause 9', control_code: 'ISO-27001-9-1', title: 'Uptime & Security Performance Audits', description: 'Evaluate system telemetry, uptimes, and logging stability.', evidence_required: ['Service SLA Reports', 'Security Incident Stats'], checklist_items: ['Audit logging system configurations', 'Track firewall drop percentages', 'Confirm backup restore capabilities'] },
  { clause_code: 'Clause 9', control_code: 'ISO-27001-9-2', title: 'Internal Security Audits', description: 'Execute systematic internal reviews of the corporate ISMS.', evidence_required: ['ISMS Audit Briefings'], checklist_items: ['Set internal audit timelines', 'Recruit external auditor for review', 'Review noncompliance reports'] },
  { clause_code: 'Clause 9', control_code: 'ISO-27001-9-3', title: 'Security Governance Output', description: 'Prepare performance reports for executive governance boards.', evidence_required: ['Governance Summary Minutes'], checklist_items: ['Outline outstanding vulnerabilities to management', 'Highlight resolved security incidents', 'Recommend budget adjustments'] },

  // Clause 10 Controls (3 controls)
  { clause_code: 'Clause 10', control_code: 'ISO-27001-10-1', title: 'Breach Response & Corrective Plans', description: 'React to security incidents with corrective action plans.', evidence_required: ['Breach Incident Reports', 'Post-Mortem Actions Plan'], checklist_items: ['Implement corrective action within SLA limits', 'Isolate affected accounts immediately', 'Review engineering gaps'] },
  { clause_code: 'Clause 10', control_code: 'ISO-27001-10-2', title: 'Continual ISMS Enhancements', description: 'Continuously refine organizational and technical security measures.', evidence_required: ['ISMS Improvement Records'], checklist_items: ['Automate security scanning triggers', 'Upgrade encryption algorithms', 'Optimize threat intelligence feeds'] },
  { clause_code: 'Clause 10', control_code: 'ISO-27001-10-3', title: 'Objective Realignment', description: 'Re-align ISMS objectives in response to changing threat landscapes.', evidence_required: ['Strategic Security Plan updates'], checklist_items: ['Audit corporate risk boundaries', 'Optimize team workflows post-incident', 'Review guidelines yearly'] },

  // Annex A5 Controls (3 controls)
  { clause_code: 'Annex A5', control_code: 'ISO-27001-A5-1', title: 'Information Security Policies', description: 'Maintain security policies approved by management and communicated to staff.', evidence_required: ['Security Policy Catalog', 'Management Approval Sign-offs'], checklist_items: ['Approve annual policy updates', 'Distribute policies via HR system', 'Enforce sign-off audits'] },
  { clause_code: 'Annex A5', control_code: 'ISO-27001-A5-2', title: 'Asset Inventory Management', description: 'Maintain an accurate inventory of corporate hardware, software, and data assets.', evidence_required: ['Asset Catalog Database', 'Software Licenses List'], checklist_items: ['Identify all data storage instances', 'List active software licenses', 'Audit corporate laptop inventory'] },
  { clause_code: 'Annex A5', control_code: 'ISO-27001-A5-3', title: 'Acceptable Asset Use Guidelines', description: 'Define and enforce guidelines governing the use of corporate systems and resources.', evidence_required: ['Acceptable Use Agreements Signature Logs'], checklist_items: ['Prohibit personal data storage on work drives', 'Enforce multi-factor authentication on developer tools', 'Enforce secure laptop locking practices'] },

  // Annex A6 Controls (3 controls)
  { clause_code: 'Annex A6', control_code: 'ISO-27001-A6-1', title: 'Background Check Procedures', description: 'Conduct security background checks on new hires, contractors, and vendors.', evidence_required: ['Candidate Verification Logs'], checklist_items: ['Verify educational credentials', 'Verify past employment history', 'Perform criminal history reviews'] },
  { clause_code: 'Annex A6', control_code: 'ISO-27001-A6-2', title: 'Contractual NDA Enforcements', description: 'Ensure non-disclosure agreements are signed before granting system access.', evidence_required: ['Signed Employee NDA Records'], checklist_items: ['Enforce NDAs during candidate hiring', 'Verify third-party NDAs are active', 'Audit employee access permissions against signed agreements'] },
  { clause_code: 'Annex A6', control_code: 'ISO-27001-A6-3', title: 'Offboarding Access Revocation', description: 'Ensure employee credentials and hardware are collected immediately upon termination.', evidence_required: ['Offboarding Sign-off Forms', 'Credential Purge Logs'], checklist_items: ['Revoke active directory permissions', 'Collect corporate laptop and keys', 'Disable email forwarding settings'] },

  // Annex A7 Controls (3 controls)
  { clause_code: 'Annex A7', control_code: 'ISO-27001-A7-1', title: 'Physical Boundary Protections', description: 'Deploy entry controls, locks, and security checkpoints to protect physical infrastructure.', evidence_required: ['Facility Access Log Databases', 'Security Guard Charters'], checklist_items: ['Deploy badge checkpoints at main entry points', 'Set up automated perimeter alarms', 'Maintain visitor registers'] },
  { clause_code: 'Annex A7', control_code: 'ISO-27001-A7-2', title: 'Secure Server Area Isolation', description: 'Isolate server rooms and operational command centers behind secure barriers.', evidence_required: ['Server Room Authorization Lists', 'Biometric Access Records'], checklist_items: ['Restrict server room access to certified staff', 'Audit biometric entry logs monthly', 'Deploy backup power supply units'] },
  { clause_code: 'Annex A7', control_code: 'ISO-27001-A7-3', title: 'Physical Media Disposal Procedures', description: 'Securely shred, degauss, or physically destroy hard drives and physical documentation.', evidence_required: ['Data Destruction Certificates'], checklist_items: ['Maintain secure paper recycling bin locks', 'Audit document shredding SLAs', 'Document hard drive serial number purges'] },

  // Annex A8 Controls (3 controls)
  { clause_code: 'Annex A8', control_code: 'ISO-27001-A8-1', title: 'Network Encryption Enforcements', description: 'Enforce transport encryption (HTTPS, TLS, SSH) across all system portals.', evidence_required: ['SSL Certificate Index', 'Transport Configuration Logs'], checklist_items: ['Deprecate insecure HTTP interfaces', 'Configure TLS 1.3 across backend APIs', 'Enforce secure SSH protocols on server nodes'] },
  { clause_code: 'Annex A8', control_code: 'ISO-27001-A8-2', title: 'Access Control Privileges', description: 'Configure granular role-based access permissions restricting user scopes.', evidence_required: ['RBAC Scopes Schema', 'User Scope Audit Log'], checklist_items: ['Apply least-privilege scoping defaults', 'Conduct monthly privilege reviews', 'Isolate production database access permissions'] },
  { clause_code: 'Annex A8', control_code: 'ISO-27001-A8-3', title: 'Endpoint Threat Protection', description: 'Deploy antivirus, file monitoring, and security baselines on user machines.', evidence_required: ['MDM Enrollment Reports', 'Antivirus Detection Records'], checklist_items: ['Enroll corporate devices in MDM', 'Enforce automated software patching cycles', 'Enforce local disk encryption'] },
];

export async function seedIso27001(prisma: any): Promise<void> {
  logger.info('🌱 Seeding ISO 27001 global framework (Clauses & Controls)...');
  let clauseCount = 0;
  let controlCount = 0;

  for (const clauseData of ISO27001_CLAUSES) {
    const clause = await prisma.iso27001_clauses.upsert({
      where: { clause_code: clauseData.clause_code },
      update: {
        title: clauseData.title,
        description: clauseData.description,
      },
      create: {
        clause_code: clauseData.clause_code,
        title: clauseData.title,
        description: clauseData.description,
        is_active: true,
      },
    });
    clauseCount++;

    const relatedControls = ISO27001_CONTROLS.filter(c => c.clause_code === clauseData.clause_code);
    for (const ctrlData of relatedControls) {
      await prisma.iso27001_controls.upsert({
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

  logger.info(`✅ ISO 27001 Seeding Completed: seeded ${clauseCount} clauses, ${controlCount} controls.`);
}

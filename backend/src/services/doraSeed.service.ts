import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

export const DORA_SECTIONS = [
  {
    section_code: 'DORA-S1',
    title: 'ICT Risk Management',
    description: 'Provisions for establishing a comprehensive ICT risk management framework, identifying assets, protection controls, detection capabilities, and continuity recovery.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'DORA-1-1',
        title: 'ICT Risk Management Framework',
        description: 'Establish a comprehensive ICT risk framework with board approval.',
        evidence_required: ['ICT Risk Framework Policy Document', 'Board Approval Minutes'],
        checklist_items: ['Draft ICT risk management strategy', 'Obtain annual board approval', 'Communicate framework to relevant stakeholders']
      },
      {
        control_code: 'DORA-1-2',
        title: 'ICT Asset Identification',
        description: 'Inventory and classify all ICT assets with dependency mapping.',
        evidence_required: ['ICT Asset Inventory Database', 'Asset Dependency Maps'],
        checklist_items: ['Log all physical and logical ICT assets', 'Map software and data dependencies', 'Identify critical business functions']
      },
      {
        control_code: 'DORA-1-3',
        title: 'Protection & Prevention Controls',
        description: 'Security policies, patching, vulnerability scanning, and access controls.',
        evidence_required: ['Patch Management Log', 'Access Control Policy'],
        checklist_items: ['Deploy monthly security patches', 'Implement vulnerability scanning tools', 'Enforce least privilege access principles']
      },
      {
        control_code: 'DORA-1-4',
        title: 'Detection Capabilities',
        description: 'SIEM deployment, anomaly detection, alert escalation, and log retention.',
        evidence_required: ['SIEM Dashboard Specs', 'Log Retention Log'],
        checklist_items: ['Configure system and security logging', 'Establish automatic anomaly alerts', 'Define alert escalation workflows']
      },
      {
        control_code: 'DORA-1-5',
        title: 'ICT Business Continuity & Recovery',
        description: 'BCP with tested RTO/RPO targets and verified backups.',
        evidence_required: ['Business Continuity Plan (BCP)', 'Backup Recovery Test Log'],
        checklist_items: ['Define Recovery Time Objectives (RTO)', 'Set Recovery Point Objectives (RPO)', 'Perform bi-annual backup restoration testing']
      }
    ]
  },
  {
    section_code: 'DORA-S2',
    title: 'ICT-Related Incident Management',
    description: 'Procedures for classifying, reporting, and responding to ICT incidents.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'DORA-2-1',
        title: 'Incident Classification',
        description: 'Severity criteria (minor/major/critical) with escalation thresholds.',
        evidence_required: ['Incident Severity Policy', 'Escalation Threshold Matrix'],
        checklist_items: ['Establish incident classification rules', 'Set thresholds for alert levels', 'Train response team on classification']
      },
      {
        control_code: 'DORA-2-2',
        title: 'Major Incident Reporting',
        description: 'Initial report ≤4h, intermediate ≤72h, final ≤1 month to competent authority.',
        evidence_required: ['Incident Report Templates', 'Authority Submission Logs'],
        checklist_items: ['Prepare initial notification template', 'Draft escalation workflow to authority', 'Verify submission timescales']
      },
      {
        control_code: 'DORA-2-3',
        title: 'Incident Response Procedures',
        description: 'Response plan, runbooks, and post-incident reviews.',
        evidence_required: ['Incident Response Plan', 'Post-Incident Review Reports'],
        checklist_items: ['Document technical system runbooks', 'Define responder responsibilities', 'Conduct post-incident root cause analysis']
      }
    ]
  },
  {
    section_code: 'DORA-S3',
    title: 'Digital Operational Resilience Testing',
    description: 'Digital resilience testing programs, including annual vulnerability assessments and threat-led penetration testing (TLPT).',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'DORA-3-1',
        title: 'Basic Digital Resilience Testing',
        description: 'Annual vulnerability assessments, pen testing, and remediation tracking.',
        evidence_required: ['Vulnerability Scan Reports', 'Remediation Tracking Log'],
        checklist_items: ['Schedule annual vulnerability assessments', 'Execute mock external penetration tests', 'Track remediation of discovered items']
      },
      {
        control_code: 'DORA-3-2',
        title: 'Threat-Led Penetration Testing (TLPT)',
        description: 'TLPT every 3 years covering live production systems.',
        evidence_required: ['TLPT Attestation Document', 'Scope definition signoff'],
        checklist_items: ['Identify qualified threat-led test provider', 'Define scope covering critical production systems', 'Execute test and submit results to authority']
      }
    ]
  },
  {
    section_code: 'DORA-S4',
    title: 'ICT Third-Party Risk',
    description: 'Framework for assessing and managing third-party ICT service provider risks.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'DORA-4-1',
        title: 'ICT Third-Party Risk Policy',
        description: 'Vendor risk assessments, criticality classification, and annual review.',
        evidence_required: ['Third-Party Risk Policy', 'Vendor Classification Matrix'],
        checklist_items: ['Define risk assessment criteria', 'Classify service criticality', 'Conduct annual vendor risk reviews']
      },
      {
        control_code: 'DORA-4-2',
        title: 'Third-Party Contractual Requirements',
        description: 'DORA provisions, exit strategy, and audit rights in all contracts.',
        evidence_required: ['Standard Contract Templates', 'Completed Exit Strategy Documentation'],
        checklist_items: ['Incorporate DORA clauses into templates', 'Verify third-party exit strategy rules', 'Establish strict audit and inspection rights']
      },
      {
        control_code: 'DORA-4-3',
        title: 'Critical ICT Provider Register',
        description: 'Complete register with concentration risk and sub-contractor chains.',
        evidence_required: ['Critical Provider Register', 'Concentration Risk Assessment'],
        checklist_items: ['Map sub-contractor supply chains', 'Document concentration metrics', 'Update provider register on changes']
      }
    ]
  },
  {
    section_code: 'DORA-S5',
    title: 'Information Sharing',
    description: 'Guidelines and agreements for sharing cyber threat intelligence.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'DORA-5-1',
        title: 'Cyber Threat Intelligence Sharing',
        description: 'ISAC membership, intelligence integration, and confidentiality protections.',
        evidence_required: ['ISAC Membership Documentation', 'Threat Sharing Protocol'],
        checklist_items: ['Join industry threat-sharing associations', 'Define intelligence processing workflows', 'Implement confidentiality data rules']
      }
    ]
  }
];

export async function seedDora(prisma: any): Promise<void> {
  logger.info('🌱 Seeding DORA global framework (Sections & Controls)...');
  let sectionCount = 0;
  let controlCount = 0;

  for (const sectionData of DORA_SECTIONS) {
    const section = await prisma.dora_sections.upsert({
      where: { section_code: sectionData.section_code },
      update: {
        title: sectionData.title,
        description: sectionData.description,
        section_type: sectionData.section_type,
        is_active: true
      },
      create: {
        section_code: sectionData.section_code,
        title: sectionData.title,
        description: sectionData.description,
        section_type: sectionData.section_type,
        is_active: true
      }
    });
    sectionCount++;

    for (const ctrlData of sectionData.controls) {
      await prisma.dora_controls.upsert({
        where: { control_code: ctrlData.control_code },
        update: {
          section_id: section.id,
          title: ctrlData.title,
          description: ctrlData.description,
          evidence_required: ctrlData.evidence_required,
          checklist_items: ctrlData.checklist_items,
          is_active: true
        },
        create: {
          section_id: section.id,
          control_code: ctrlData.control_code,
          title: ctrlData.title,
          description: ctrlData.description,
          evidence_required: ctrlData.evidence_required,
          checklist_items: ctrlData.checklist_items,
          is_active: true
        }
      });
      controlCount++;
    }
  }

  logger.info(`✅ DORA Seeding Completed: seeded ${sectionCount} sections, ${controlCount} controls.`);
}

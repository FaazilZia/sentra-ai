import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

export const OECD_SECTIONS = [
  {
    section_code: 'OECD-P1',
    title: 'Inclusive Growth & Sustainable Development',
    description: 'Guidelines to ensure AI systems contribute to inclusive growth, sustainable development, and global environmental and societal well-being.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'OECD-1-1',
        title: 'Societal Benefit Assessment',
        description: 'Document SDG alignment, identify harms, and consider vulnerable populations.',
        evidence_required: ['Societal Impact Assessment Report', 'SDG Mapping Matrix'],
        checklist_items: ['Identify target Sustainable Development Goals', 'Analyze potential negative societal harms', 'Define mitigation paths for vulnerable cohorts']
      },
      {
        control_code: 'OECD-1-2',
        title: 'Equitable Access',
        description: 'Demographic bias testing, accessibility features, and inclusion metrics.',
        evidence_required: ['Accessibility Audit Report', 'Equitable Access Policy'],
        checklist_items: ['Incorporate accessibility standards (e.g., WCAG)', 'Deploy demographic access monitoring', 'Establish inclusion improvement targets']
      }
    ]
  },
  {
    section_code: 'OECD-P2',
    title: 'Human-Centred Values & Fairness',
    description: 'Ensure respect for human rights, fairness, non-discrimination, privacy by design, and procedural safeguards.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'OECD-2-1',
        title: 'Human Rights Impact Assessment',
        description: 'Rights risk register and grievance mechanism.',
        evidence_required: ['Human Rights Risk Register', 'Grievance Intake Process Flow'],
        checklist_items: ['Perform human rights compliance audit', 'Launch public/internal grievance channel', 'Define grievance resolution workflow']
      },
      {
        control_code: 'OECD-2-2',
        title: 'Fairness & Non-Discrimination',
        description: 'Bias testing, protected attribute analysis, and fairness metrics monitoring.',
        evidence_required: ['Algorithmic Bias Test Log', 'Fairness Metrics Policy'],
        checklist_items: ['Define protected consumer attributes list', 'Run disparate impact evaluations', 'Schedule monthly automated bias checks']
      },
      {
        control_code: 'OECD-2-3',
        title: 'Privacy by Design',
        description: 'DPIA, data minimization, consent mechanisms, and data subject rights.',
        evidence_required: ['Data Protection Impact Assessment (DPIA)', 'Consent Framework Spec'],
        checklist_items: ['Conduct privacy risk assessment', 'Validate data minimization rules', 'Ensure right to be forgotten compliance']
      }
    ]
  },
  {
    section_code: 'OECD-P3',
    title: 'Transparency & Explainability',
    description: 'Provide appropriate transparency and explainability regarding AI systems to enable users to understand outputs and challenge outcomes.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'OECD-3-1',
        title: 'Algorithmic Transparency',
        description: 'Model card, known limitations disclosed, and decision logic documented.',
        evidence_required: ['Model Cards / Metadata Specs', 'Algorithmic Disclosure Page'],
        checklist_items: ['Build and publish interactive model cards', 'Outline system functional boundaries', 'Document core decision logic frameworks']
      },
      {
        control_code: 'OECD-3-2',
        title: 'AI Disclosure to Users',
        description: 'AI interaction disclosures, human review option, and disclosure clarity tested.',
        evidence_required: ['User Interface Screenshots', 'AI Notification Policy'],
        checklist_items: ['Expose clear notices during AI interactions', 'Provide direct human routing toggle', 'Conduct readability testing on notices']
      },
      {
        control_code: 'OECD-3-3',
        title: 'Explainability of Decisions',
        description: 'Explainability method documented and contestability process available.',
        evidence_required: ['Explainability System Architecture', 'Contestability Flowchart'],
        checklist_items: ['Select and deploy explainability models (e.g. SHAP)', 'Design clear consumer dispute portal', 'Define timeline to process decision disputes']
      }
    ]
  },
  {
    section_code: 'OECD-P4',
    title: 'Robustness, Security & Safety',
    description: 'Build systems that are robust, secure, and safe, with continuous risk management, fail-safes, and safety checks.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'OECD-4-1',
        title: 'Technical Robustness',
        description: 'Accuracy benchmarks, edge case and adversarial testing, and degradation monitoring.',
        evidence_required: ['Robustness Benchmarking Logs', 'System Performance Metrics'],
        checklist_items: ['Establish model accuracy benchmarks', 'Conduct regular adversarial input runs', 'Configure real-time drift alerts']
      },
      {
        control_code: 'OECD-4-2',
        title: 'Security Against Attacks',
        description: 'Threat model, data poisoning protections, and model extraction countermeasures.',
        evidence_required: ['AI Threat Model Document', 'Poisoning Protection Specs'],
        checklist_items: ['Perform threat modeling exercise', 'Validate model pipeline isolation', 'Add protections for prompt injection']
      },
      {
        control_code: 'OECD-4-3',
        title: 'Safety Mechanisms',
        description: 'Fail-safe mechanisms, human override capability, and safety testing.',
        evidence_required: ['Fail-Safe System Architecture', 'Safety Incident Log'],
        checklist_items: ['Establish system boundary fail-safes', 'Embed emergency human intervention hooks', 'Run safety scenario simulations annually']
      }
    ]
  },
  {
    section_code: 'OECD-P5',
    title: 'Accountability',
    description: 'Ensure organizational accountability, auditability, decision traceability, and grievance redress channels.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'OECD-5-1',
        title: 'Accountability Framework',
        description: 'RACI matrix, board-level AI oversight, and annual review.',
        evidence_required: ['Oversight Committee Charter', 'AI RACI Matrix'],
        checklist_items: ['Appoint board-level governance owner', 'Draft AI systems RACI chart', 'Review compliance roadmap annually']
      },
      {
        control_code: 'OECD-5-2',
        title: 'Auditability & Traceability',
        description: 'Decision audit logs, training data lineage, and model versioning.',
        evidence_required: ['Traceability Audit Trail', 'Lineage Map Configuration'],
        checklist_items: ['Log all critical user and system decisions', 'Track training data origin records', 'Implement automated model version tracking']
      },
      {
        control_code: 'OECD-5-3',
        title: 'Redress & Remedy',
        description: 'Redress mechanism published, complaint intake, and resolution SLA.',
        evidence_required: ['Redress Process Guide', 'SLA Response Tracking Log'],
        checklist_items: ['Publish user redress pathways', 'Deploy complaint tracking database', 'Validate strict resolution SLAs']
      }
    ]
  }
];

export async function seedOecd(prisma: any): Promise<void> {
  logger.info('🌱 Seeding OECD global framework (Sections & Controls)...');
  let sectionCount = 0;
  let controlCount = 0;

  for (const sectionData of OECD_SECTIONS) {
    const section = await prisma.oecd_sections.upsert({
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
      await prisma.oecd_controls.upsert({
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

  logger.info(`✅ OECD Seeding Completed: seeded ${sectionCount} sections, ${controlCount} controls.`);
}

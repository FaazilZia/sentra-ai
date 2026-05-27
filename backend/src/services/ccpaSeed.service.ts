import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

export const CCPA_SECTIONS = [
  {
    section_code: 'S1',
    title: 'Right to Know and Access',
    description: 'Provisions requiring organizations to disclose what personal data and AI-derived training profiles are collected, used, and shared.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'CCPA-S1-1',
        title: 'Personal Data Inventory',
        description: 'Inventory and map all personal information (PII) processed by the organization, including data ingested into machine learning training datasets and runtime inference caches.',
        evidence_required: ['Data Inventory Mapping Document', 'Data Provenance and Lineage Map'],
        checklist_items: ['Identify all consumer data ingestion channels', 'Document types of PII stored', 'Map data flows to machine learning components']
      },
      {
        control_code: 'CCPA-S1-2',
        title: 'Right to Access Requests',
        description: 'Mechanism allowing consumers to submit verifiable requests to access their specific pieces of personal information and data categories collected.',
        evidence_required: ['Consumer Privacy Request Workflow', 'Sample Access Request Response'],
        checklist_items: ['Deploy consumer intake portal for access requests', 'Validate consumer identity matching CCPA standard', 'Format output files in portable, readable structure']
      }
    ]
  },
  {
    section_code: 'S2',
    title: 'Right to Delete',
    description: 'Enabling consumers to request the deletion of their personal data, including removal from training datasets and fine-tuning caches.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'CCPA-S2-1',
        title: 'Data Erasure Workflows',
        description: 'Establish automated and manual data purging workflows across production databases, analytical warehouses, and backup systems.',
        evidence_required: ['Data Deletion Policy', 'System Erasure Verification Log'],
        checklist_items: ['Set up database delete cascades or triggers', 'Establish hard deletion intervals for inactive backups', 'Verify deletion across secondary cloud storage volumes']
      },
      {
        control_code: 'CCPA-S2-2',
        title: 'AI Training Data Retraction',
        description: 'Establish a procedural framework for purging or untraining consumer data from active machine learning models or fine-tuning pipelines.',
        evidence_required: ['AI Model Data Retraction Procedure', 'Model retraining verification log'],
        checklist_items: ['Audit model training datasets for deleted consumer data', 'Establish a routine model retraining schedule post-deletion', 'Verify model outputs do not retain deleted user data representations']
      }
    ]
  },
  {
    section_code: 'S3',
    title: 'Right to Opt-Out of Sale or Sharing',
    description: 'Allowing consumers to opt-out of the sale or sharing of their personal information, particularly in advertising and profiling networks.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'CCPA-S3-1',
        title: 'Do Not Sell or Share Link',
        description: 'Provide a clear, conspicuous link titled "Do Not Sell or Share My Personal Information" on the website homepage to allow opt-out of sharing.',
        evidence_required: ['Website Homepage Opt-Out Link Screenshot', 'Opt-out processing log'],
        checklist_items: ['Expose clear opt-out links on footer of all pages', 'Verify links route to functional opt-out preferences dashboard', 'Instantly stop sharing data upon click event']
      },
      {
        control_code: 'CCPA-S3-2',
        title: 'Global Privacy Control (GPC) Processing',
        description: 'Detect and process opt-out preference signals sent by browser plug-ins (e.g., GPC) automatically without requiring manual consumer forms.',
        evidence_required: ['GPC Integration Test Log', 'Opt-out Signal Configuration Specs'],
        checklist_items: ['Implement automated GPC request headers inspection', 'Map GPC signals directly to the user preference cache', 'Block commercial telemetry scripts when GPC signal is active']
      }
    ]
  },
  {
    section_code: 'S4',
    title: 'Right to Correct Inaccurate Personal Information',
    description: 'Giving consumers the right to request correction of inaccurate personal data held by the organization, including AI profiling models.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'CCPA-S4-1',
        title: 'Consumer Data Correction Portal',
        description: 'Provide an easy-to-use interface or portal where consumers can submit requests to rectify or update inaccurate personal records.',
        evidence_required: ['Correction Request Form Specs', 'User Profile Verification Steps'],
        checklist_items: ['Publish correction intake form on privacy portal', 'Define steps to verify request authenticity', 'Audit processing latency for corrections']
      },
      {
        control_code: 'CCPA-S4-2',
        title: 'Profiling Correction Pipeline',
        description: 'Ensure that corrected personal information is propagated to downstream machine learning profiling pipelines, recommendation models, and scoring systems.',
        evidence_required: ['Data Synchronization Logs', 'Profiling Model Retraining Spec'],
        checklist_items: ['Propagate corrected entries to predictive analytics databases', 'Re-trigger scoring runs immediately post-correction', 'Verify updated scores reflect accurate consumer profiles']
      }
    ]
  },
  {
    section_code: 'S5',
    title: 'Sensitive Personal Information (SPI) Handling',
    description: 'Regulating the collection, processing, and storage of high-risk sensitive consumer data (biometrics, precise location, etc.).',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'CCPA-S5-1',
        title: 'Limit Use of Sensitive Personal Information',
        description: 'Enforce technical and administrative controls to limit the use of Sensitive Personal Information (SPI) strictly to necessary operational tasks.',
        evidence_required: ['SPI Processing Consent Log', 'SPI Use Restriction Policy'],
        checklist_items: ['Provide "Limit the Use of My Sensitive Personal Information" link', 'Tag and isolate SPI fields in DB schema', 'Audit internal services accessing sensitive databases']
      },
      {
        control_code: 'CCPA-S5-2',
        title: 'SPI Encryption & Access Controls',
        description: 'Apply advanced encryption mechanisms and strict role-based access control (RBAC) to all databases and caches storing Sensitive Personal Information.',
        evidence_required: ['Envelope Encryption Specs', 'SPI Access Audit Log'],
        checklist_items: ['Encrypt SPI at rest using unique managed keys', 'Audit and log all employee queries on SPI tables', 'Establish multi-factor authentication for SPI tables']
      }
    ]
  },
  {
    section_code: 'S6',
    title: 'Enforcement Risk Statutory Damage Mitigations',
    description: 'Policies and controls to mitigate security breach risks that expose consumers to statutory damages and regulatory enforcement.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'CCPA-S6-1',
        title: 'Reasonable Security Measures',
        description: 'Establish robust, multi-layered cybersecurity controls (firewalls, vulnerability scanning, continuous logging) to protect consumer personal data.',
        evidence_required: ['Annual Penetration Test Report', 'Vulnerability Assessment Log'],
        checklist_items: ['Conduct quarterly network vulnerability scans', 'Deploy firewalls and intrusion detection systems', 'Collect and archive all data access logs in a write-once repository']
      },
      {
        control_code: 'CCPA-S6-2',
        title: 'Data Breach Incident Response Plan',
        description: 'Establish a rapid incident response plan with SLA-based containment, mitigation, and notification protocols to limit statutory damage risks under CCPA.',
        evidence_required: ['Incident Response SLA Document', 'Breach Simulation Log'],
        checklist_items: ['Publish consumer breach notification templates', 'Define clear communication channels and DPO escalation routes', 'Run breach response tabletop exercises twice a year']
      }
    ]
  }
];

export async function seedCcpa(prisma: any): Promise<void> {
  logger.info('🌱 Seeding CCPA global framework (Sections & Controls)...');
  let sectionCount = 0;
  let controlCount = 0;

  for (const sectionData of CCPA_SECTIONS) {
    const section = await prisma.ccpa_sections.upsert({
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
      await prisma.ccpa_controls.upsert({
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

  logger.info(`✅ CCPA Seeding Completed: seeded ${sectionCount} sections, ${controlCount} controls.`);
}

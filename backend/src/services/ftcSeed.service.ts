import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

export const FTC_SECTIONS = [
  {
    section_code: 'FTC-S1',
    title: 'Truthfulness & Non-Deception',
    description: 'Ensure all public marketing, user expectations, and AI system claims are truthful, not deceptive, and fully substantiated.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'FTC-1-1',
        title: 'No False or Misleading Claims',
        description: 'AI output review, false claim detection, and substantiation requirements.',
        evidence_required: ['Marketing Copy Review Logs', 'Claim Substantiation Repository'],
        checklist_items: ['Audit public performance claims', 'Verify empirical support for capabilities', 'Implement AI output review guardrails']
      },
      {
        control_code: 'FTC-1-2',
        title: 'Synthetic Media Disclosure',
        description: 'AI-generated content labeling policy and deepfake detection.',
        evidence_required: ['Content Labeling Strategy', 'Synthetic Media Detection Log'],
        checklist_items: ['Enforce watermark/tag on AI images/text', 'Configure deepfake scanning for user uploads', 'Track user compliance with media labeling']
      },
      {
        control_code: 'FTC-1-3',
        title: 'AI Endorsement Disclosures',
        description: 'AI-generated reviews labeled and marketing materials reviewed.',
        evidence_required: ['Endorsement Compliance Audit', 'Influencer Disclosure Policy'],
        checklist_items: ['Identify all synthetic endorsements', 'Label automated testimonial/reviews clearly', 'Monitor marketing content regularly']
      }
    ]
  },
  {
    section_code: 'FTC-S2',
    title: 'Fairness & Non-Discrimination',
    description: 'Guidelines to identify and eliminate bias, unfair trade practices, and civil rights violations caused by algorithmic decision-making.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'FTC-2-1',
        title: 'Algorithmic Fairness Testing',
        description: 'Protected class analysis, disparate impact testing, and annual bias audit.',
        evidence_required: ['Algorithmic Fairness Audit Report', 'Disparate Impact Test Logs'],
        checklist_items: ['Identify demographic protected features', 'Run disparate impact mathematical checks', 'Deploy annual bias validation reviews']
      },
      {
        control_code: 'FTC-2-2',
        title: 'Fair Credit & Lending Practices',
        description: 'ECOA compliance, adverse action notices, and protected class validation.',
        evidence_required: ['Lending Disclosures Spec', 'Adverse Action Response Logs'],
        checklist_items: ['Incorporate Equal Credit Opportunity Act rules', 'Automate adverse action notices generation', 'Filter protected class features from models']
      },
      {
        control_code: 'FTC-2-3',
        title: 'Dynamic Pricing Fairness',
        description: 'Pricing algorithm documented, price disparity analysis, and monitoring active.',
        evidence_required: ['Pricing Model Specification', 'Pricing Disparity Logs'],
        checklist_items: ['Document model variables for pricing', 'Track pricing outliers and differences', 'Monitor dynamically updated price logs']
      }
    ]
  },
  {
    section_code: 'FTC-S3',
    title: 'Transparency & Disclosure',
    description: 'Requirements to clearly disclose AI usage, operational boundaries, and consumers rights to opt-out or challenge outputs.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'FTC-3-1',
        title: 'AI Use Disclosure to Consumers',
        description: 'Disclosed at point of impact, plain language tested, and opt-out where required.',
        evidence_required: ['Consumer Disclosures Policy', 'Opt-out preference dashboard screenshots'],
        checklist_items: ['Deploy consumer disclosure notices', 'Validate easy-to-read language formats', 'Establish operational opt-out pathways']
      },
      {
        control_code: 'FTC-3-2',
        title: 'Algorithmic Accountability Statements',
        description: 'Published AI use policy, board-approved, and updated on system changes.',
        evidence_required: ['AI Governance Statement', 'Board Approval Document'],
        checklist_items: ['Draft algorithmic transparency policy', 'Secure board approval signature', 'Update policy upon model structural changes']
      }
    ]
  },
  {
    section_code: 'FTC-S4',
    title: 'Privacy & Data Protection',
    description: 'Ensure proper data minimization, consumer consent workflows, and secure storage systems for all user data.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'FTC-4-1',
        title: 'Data Minimization for AI Training',
        description: 'Training data sources documented, consent captured, and opt-out available.',
        evidence_required: ['Data Provenance Audit Log', 'Opt-out preferences repository'],
        checklist_items: ['Document ingestion datasets provenance', 'Obtain consumer usage permission', 'Isolate opt-out datasets from pipeline']
      },
      {
        control_code: 'FTC-4-2',
        title: 'Consumer Data Rights in AI Context',
        description: 'Access/correction/deletion propagated to models, 30-day SLA.',
        evidence_required: ['Data Subject Rights Process', 'Model Untraining Schedule'],
        checklist_items: ['Establish 30-day request resolution SLA', 'Propagate request deletion to training logs', 'Audit model parameters post-retraction']
      }
    ]
  },
  {
    section_code: 'FTC-S5',
    title: 'Security & Accountability',
    description: 'Establish secure technical boundaries, prompt injection protections, human override capabilities, and clear pathways to report harms.',
    section_type: 'SECTION',
    controls: [
      {
        control_code: 'FTC-5-1',
        title: 'AI System Security Program',
        description: 'Prompt injection protections, model access controls, and incidents tracked.',
        evidence_required: ['Security Incident Log', 'Model Access Controls Architecture'],
        checklist_items: ['Deploy prompt injection firewalls', 'Establish model API token limits', 'Keep central incident tracking logs']
      },
      {
        control_code: 'FTC-5-2',
        title: 'Human Oversight & Accountability',
        description: 'Override capability for high-stakes decisions and accountability chain documented.',
        evidence_required: ['Human-in-the-Loop Process Map', 'Decision Override Audit Logs'],
        checklist_items: ['Identify high-stakes business decisions', 'Enforce human review override protocols', 'Document decision audit trails']
      },
      {
        control_code: 'FTC-5-3',
        title: 'Consumer Harm Remediation',
        description: 'Harm reporting channel, investigation process, and systemic harms escalated.',
        evidence_required: ['Harm Reporting Portal Specs', 'Remediation Workflow Guide'],
        checklist_items: ['Provide public harm reporting forms', 'Launch consumer support investigation tool', 'Define escalation path for major incidents']
      }
    ]
  }
];

export async function seedFtc(prisma: any): Promise<void> {
  logger.info('🌱 Seeding FTC global framework (Sections & Controls)...');
  let sectionCount = 0;
  let controlCount = 0;

  for (const sectionData of FTC_SECTIONS) {
    const section = await prisma.ftc_sections.upsert({
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
      await prisma.ftc_controls.upsert({
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

  logger.info(`✅ FTC Seeding Completed: seeded ${sectionCount} sections, ${controlCount} controls.`);
}

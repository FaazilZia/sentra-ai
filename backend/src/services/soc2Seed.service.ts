import logger from '../utils/logger';

export const SOC2_CHAPTERS = [
  {
    chapterNumber: 'Security',
    title: 'Common Criteria (Security)',
    description: 'Core controls for logic access, systems firewalling, intrusion prevention, change governance, and operational resilience.',
    controls: [
      {
        articleNumber: 'CC1.1',
        title: 'Organizational Ethics & Integrity',
        description: 'The entity demonstrates a commitment to integrity and ethical values throughout the organization.',
        requirement: 'Publish code of conduct policies and establish whistleblower escalation structures.',
      },
      {
        articleNumber: 'CC3.2',
        title: 'Vulnerability Management',
        description: 'The entity identifies risks to the achievement of its objectives and assesses vulnerability indicators.',
        requirement: 'Run monthly automated vulnerability scans and annual external penetration testing.',
      },
      {
        articleNumber: 'CC6.1',
        title: 'Logical Access Controls',
        description: 'The entity restricts logical access to security-sensitive data assets, systems, and APIs.',
        requirement: 'Enforce multi-factor authentication (MFA) and conditional access protocols for all systems.',
      },
      {
        articleNumber: 'CC6.2',
        title: 'User Access Reviews',
        description: 'Access rights are granted, modified, and revoked based on authorized permissions.',
        requirement: 'Conduct quarterly system access reviews to confirm user roles match active business scopes.',
      },
      {
        articleNumber: 'CC6.3',
        title: 'Asset Classification & Registration',
        description: 'The entity maintains a registered inventory of hardware, software, and data repositories.',
        requirement: 'Register and class all production hosts, databases, and LLM model services.',
      },
      {
        articleNumber: 'CC6.6',
        title: 'Boundary Protections',
        description: 'The entity protects transmission boundaries, including internal and external networks.',
        requirement: 'Deploy web application firewalls (WAF) and restrict cross-zone database routing.',
      },
      {
        articleNumber: 'CC6.7',
        title: 'Transmission Cryptography',
        description: 'The entity prevents transmission interception through robust cryptographic standards.',
        requirement: 'Require TLS 1.3 encryption transit protocols across all application nodes.',
      },
      {
        articleNumber: 'CC7.1',
        title: 'Intrusion Detection & Monitoring',
        description: 'The entity monitors infrastructure status to identify anomalies and indicators of compromise.',
        requirement: 'Configure SIEM systems and set up real-time endpoint warning alerts.',
      },
      {
        articleNumber: 'CC7.2',
        title: 'Incident Response Governance',
        description: 'The entity establishes protocols for handling, neutralizing, and reporting security incidents.',
        requirement: 'Maintain incident response playbooks and run annual tabletop mock scenarios.',
      },
      {
        articleNumber: 'CC8.1',
        title: 'Change Governance',
        description: 'The entity authorizes, designs, tests, and validates system alterations prior to deployment.',
        requirement: 'Enforce peer code reviews, CI/CD automated test runs, and product manager signoffs.',
      }
    ]
  },
  {
    chapterNumber: 'Availability',
    title: 'Availability Criteria',
    description: 'System capacity planning, environmental monitoring, backup storage systems, and business continuity.',
    controls: [
      {
        articleNumber: 'A1.1',
        title: 'Capacity Management',
        description: 'Monitor capacity usage to prevent resource exhaustion and ensure target system availability.',
        requirement: 'Configure CPU/memory autoscaling and load threshold alert triggers.',
      },
      {
        articleNumber: 'A1.2',
        title: 'System Backups',
        description: 'Execute regular database and configuration backups, storing them in isolated, encrypted regions.',
        requirement: 'Implement daily automated database snapshots with 30-day retention policies.',
      },
      {
        articleNumber: 'A1.3',
        title: 'Business Continuity & Disaster Recovery',
        description: 'Test recovery protocols to ensure business services can be restored during primary site failures.',
        requirement: 'Perform annual disaster recovery exercises and verify recovery point objectives (RPO).',
      }
    ]
  },
  {
    chapterNumber: 'Processing',
    title: 'Processing Integrity Criteria',
    description: 'Data input accuracy, execution validity, and output verification.',
    controls: [
      {
        articleNumber: 'PI1.1',
        title: 'System Input Verification',
        description: 'Ensure inputs into processing systems are accurate, authorized, complete, and formatted correctly.',
        requirement: 'Enforce schema validation and prompt sanitation on incoming API calls.',
      },
      {
        articleNumber: 'PI1.2',
        title: 'Execution Validation',
        description: 'Validate that processing pipelines operate consistently and logs capture execution metrics.',
        requirement: 'Configure transaction tracing and trace identifiers across LLM chains.',
      },
      {
        articleNumber: 'PI1.3',
        title: 'Output Reconciliation',
        description: 'Verify system outputs match input parameters and reconcile processing volumes.',
        requirement: 'Build validation scripts to compare batch logs against database entries.',
      }
    ]
  },
  {
    chapterNumber: 'Confidentiality',
    title: 'Confidentiality Criteria',
    description: 'Information classification, retention policies, and data disposal protocols.',
    controls: [
      {
        articleNumber: 'C1.1',
        title: 'Asset Declassification & Retention',
        description: 'Identify and classify confidential data, applying targeted retention periods based on compliance needs.',
        requirement: 'Define data retention limits and schedule automated pruning routines.',
      },
      {
        articleNumber: 'C1.2',
        title: 'Encryption at Rest',
        description: 'Encrypt stored confidential data to prevent data leakage from physical disk theft.',
        requirement: 'Apply AES-256 block-level encryption for all production database nodes.',
      }
    ]
  },
  {
    chapterNumber: 'Privacy',
    title: 'Privacy Criteria',
    description: 'Consent governance, transparency disclosures, and data rights execution.',
    controls: [
      {
        articleNumber: 'P1.1',
        title: 'Consent Declarations',
        description: 'Disclose personal information collection purposes and obtain user consent preferences.',
        requirement: 'Deploy user consent trackers and block tracking parameters on opt-out.',
      },
      {
        articleNumber: 'P1.2',
        title: 'Subject Access Rights',
        description: 'Process user inquiries and support user requests to access, rectify, or purge personal files.',
        requirement: 'Expose self-service data management dashboards for client profiles.',
      }
    ]
  }
];

export async function seedSoc2(organizationId: string, prisma: any): Promise<void> {
  logger.info(`🌱 Seeding SOC2 framework for organization ${organizationId}...`);
  let chapterCount = 0;
  let controlCount = 0;

  for (const chapterData of SOC2_CHAPTERS) {
    let chapter = await prisma.soc2Chapter.findFirst({
      where: {
        organizationId,
        chapterNumber: chapterData.chapterNumber,
      }
    });

    if (!chapter) {
      chapter = await prisma.soc2Chapter.create({
        data: {
          organizationId,
          chapterNumber: chapterData.chapterNumber,
          title: chapterData.title,
          description: chapterData.description,
        }
      });
    } else {
      chapter = await prisma.soc2Chapter.update({
        where: { id: chapter.id },
        data: {
          title: chapterData.title,
          description: chapterData.description,
        }
      });
    }
    chapterCount++;

    for (const ctrlData of chapterData.controls) {
      const control = await prisma.soc2Control.findFirst({
        where: {
          organizationId,
          chapterId: chapter.id,
          articleNumber: ctrlData.articleNumber,
        }
      });

      if (!control) {
        await prisma.soc2Control.create({
          data: {
            organizationId,
            chapterId: chapter.id,
            articleNumber: ctrlData.articleNumber,
            title: ctrlData.title,
            description: ctrlData.description,
            requirement: ctrlData.requirement,
            status: 'NOT_STARTED',
          }
        });
      } else {
        await prisma.soc2Control.update({
          where: { id: control.id },
          data: {
            title: ctrlData.title,
            description: ctrlData.description,
            requirement: ctrlData.requirement,
          }
        });
      }
      controlCount++;
    }
  }

  logger.info(`✅ SOC2 Seeding Completed for org ${organizationId}: seeded ${chapterCount} chapters, ${controlCount} controls.`);
}

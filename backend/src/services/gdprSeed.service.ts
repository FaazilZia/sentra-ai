import logger from '../utils/logger';

export const GDPR_CHAPTERS = [
  {
    chapterNumber: 'Chapter 1',
    title: 'General Provisions',
    description: 'General framework conditions, subject matter, scope, and definitions.',
    controls: [
      {
        articleNumber: 'Article 1',
        title: 'Subject-matter and objectives',
        description: 'This Regulation lays down rules relating to the protection of natural persons with regard to the processing of personal data and rules relating to the free movement of personal data.',
        requirement: 'Establish baseline privacy objectives and align processing activities with core protection principles.',
      },
      {
        articleNumber: 'Article 2',
        title: 'Material scope',
        description: 'Applies to the processing of personal data wholly or partly by automated means and to the processing other than by automated means which form part of a filing system.',
        requirement: 'Identify and catalog all automated and manual personal data processing activities.',
      },
      {
        articleNumber: 'Article 3',
        title: 'Territorial scope',
        description: 'Applies to the processing of personal data in the context of the activities of an establishment of a controller or a processor in the Union.',
        requirement: 'Define territorial applicability and appoint EU representative if located outside the EU.',
      },
      {
        articleNumber: 'Article 4',
        title: 'Definitions',
        description: 'Key terms including personal data, processing, profiling, controller, and processor.',
        requirement: 'Define and maintain standardized data governance terminology across all internal systems.',
      }
    ]
  },
  {
    chapterNumber: 'Chapter 2',
    title: 'Principles',
    description: 'Core principles relating to the processing of personal data, including lawfulness, fairness, and transparency.',
    controls: [
      {
        articleNumber: 'Article 5',
        title: 'Principles relating to processing of personal data',
        description: 'Personal data shall be processed lawfully, fairly, and in a transparent manner.',
        requirement: 'Implement data minimization, purpose limitation, and storage limitation constraints.',
      },
      {
        articleNumber: 'Article 6',
        title: 'Lawfulness of processing',
        description: 'Processing is lawful only if consent is obtained or other legal basis applies.',
        requirement: 'Document and verify the legal basis for every personal data processing registry.',
      }
    ]
  },
  {
    chapterNumber: 'Chapter 3',
    title: 'Rights of Data Subject',
    description: 'Rights granted to individuals, including transparency, access, correction, erasure, and portability.',
    controls: [
      {
        articleNumber: 'Article 12',
        title: 'Transparent information, communication and modalities',
        description: 'Controller must provide information in a concise, transparent, intelligible and easily accessible form.',
        requirement: 'Publish a clear privacy notice and deploy an accessible intake portal for requests.',
      },
      {
        articleNumber: 'Article 13',
        title: 'Information to be provided where personal data are collected',
        description: 'Provide details about identity, purposes, retention, and rights at the time of data collection.',
        requirement: 'Integrate dynamic privacy notices at all consumer data collection touchpoints.',
      },
      {
        articleNumber: 'Article 15',
        title: 'Right of access by the data subject',
        description: 'Subject has the right to obtain confirmation as to whether or not personal data are being processed and access to it.',
        requirement: 'Build data extraction flows to compile comprehensive user profile archives upon request.',
      },
      {
        articleNumber: 'Article 17',
        title: 'Right to erasure (\'right to be forgotten\')',
        description: 'Subject has the right to obtain from the controller the erasure of personal data without undue delay.',
        requirement: 'Develop automated purging routines across production databases and backup environments.',
      },
      {
        articleNumber: 'Article 20',
        title: 'Right to data portability',
        description: 'Right to receive personal data in a structured, commonly used and machine-readable format.',
        requirement: 'Ensure data export files conform to standard, portable JSON or CSV formats.',
      }
    ]
  },
  {
    chapterNumber: 'Chapter 4',
    title: 'Controller and Processor',
    description: 'Obligations of controllers and processors, security of processing, and impact assessments.',
    controls: [
      {
        articleNumber: 'Article 24',
        title: 'Responsibility of the controller',
        description: 'Implement appropriate technical and organizational measures to ensure compliance.',
        requirement: 'Conduct regular security reviews and establish standard operating procedures for data access.',
      },
      {
        articleNumber: 'Article 25',
        title: 'Data protection by design and by default',
        description: 'Implement appropriate technical and organizational measures at the time of planning and processing.',
        requirement: 'Integrate automated PII scanning and data protection guardrails into the software build pipeline.',
      },
      {
        articleNumber: 'Article 30',
        title: 'Records of processing activities',
        description: 'Maintain a record of processing activities under its responsibility.',
        requirement: 'Establish and update the Record of Processing Activities (RoPA) regularly.',
      },
      {
        articleNumber: 'Article 32',
        title: 'Security of processing',
        description: 'Ensure a level of security appropriate to the risk, including encryption and resilience.',
        requirement: 'Implement AES-256 encryption at rest, TLS 1.3 in transit, and multi-factor authentication.',
      },
      {
        articleNumber: 'Article 35',
        title: 'Data protection impact assessment',
        description: 'Carry out an assessment of the impact of the envisaged processing operations on the protection of personal data.',
        requirement: 'Perform and document a DPIA prior to launching any new high-risk processing or AI agent.',
      }
    ]
  },
  {
    chapterNumber: 'Chapter 5',
    title: 'Transfers of Personal Data',
    description: 'Rules governing transfers of personal data to third countries or international organizations.',
    controls: [
      {
        articleNumber: 'Article 44',
        title: 'General principle for transfers',
        description: 'Ensure compliance with conditions for transferring personal data outside the EU.',
        requirement: 'Map and review cross-border data transfer agreements and ensure adequate safeguards.',
      },
      {
        articleNumber: 'Article 45',
        title: 'Transfers on the basis of an adequacy decision',
        description: 'Transfers may take place if the Commission has decided that the third country ensures adequacy.',
        requirement: 'Maintain registry of adequacy decisions for active international data pathways.',
      }
    ]
  },
  {
    chapterNumber: 'Chapter 6',
    title: 'Supervisory Authorities',
    description: 'Rules regarding independent public authorities responsible for monitoring compliance.',
    controls: [
      {
        articleNumber: 'Article 51',
        title: 'Supervisory authority',
        description: 'Each Member State shall provide for one or more independent public authorities to monitor GDPR compliance.',
        requirement: 'Identify and document the primary supervisory authority governing the organization\'s main establishment.',
      }
    ]
  },
  {
    chapterNumber: 'Chapter 7',
    title: 'Cooperation & Consistency',
    description: 'Mechanisms for cooperation among supervisory authorities across Member States.',
    controls: [
      {
        articleNumber: 'Article 60',
        title: 'Cooperation between the lead supervisory authority and other concerned authorities',
        description: 'Exchange of information and mutual assistance under the one-stop-shop mechanism.',
        requirement: 'Formulate escalation procedures for handling cross-border data protection inquiries or disputes.',
      }
    ]
  },
  {
    chapterNumber: 'Chapter 8',
    title: 'Remedies, Liability and Penalties',
    description: 'Rights to lodge complaints, seek judicial remedies, and rules on administrative fines.',
    controls: [
      {
        articleNumber: 'Article 77',
        title: 'Right to lodge a complaint with a supervisory authority',
        description: 'Every data subject has the right to lodge a complaint with a supervisory authority.',
        requirement: 'Provide clear instructions in the privacy policy on how subjects can file complaints with authorities.',
      },
      {
        articleNumber: 'Article 82',
        title: 'Right to compensation and liability',
        description: 'Any person who has suffered material or non-material damage has the right to compensation.',
        requirement: 'Establish financial liability reserves and cyber insurance coverage for potential breach penalties.',
      },
      {
        articleNumber: 'Article 83',
        title: 'General conditions for imposing administrative fines',
        description: 'Imposition of administrative fines shall be effective, proportionate and dissuasive.',
        requirement: 'Ensure high readiness scores to avoid maximum statutory penalties of 4% of global turnover.',
      }
    ]
  },
  {
    chapterNumber: 'Chapter 9',
    title: 'Provisions Relating to Specific Processing Situations',
    description: 'Specific processing conditions such as employment context, freedom of expression, and public access.',
    controls: [
      {
        articleNumber: 'Article 88',
        title: 'Processing in the employment context',
        description: 'Provide for more specific rules to ensure the protection of rights in respect of employees.',
        requirement: 'Establish employee-specific data handling policies and separate employee consent profiles.',
      }
    ]
  },
  {
    chapterNumber: 'Chapter 10',
    title: 'Delegated Acts and Implementing Acts',
    description: 'Committee procedures and standard form criteria.',
    controls: [
      {
        articleNumber: 'Article 92',
        title: 'Exercise of the delegation',
        description: 'Delegation of power to the Commission to adopt delegated acts.',
        requirement: 'Verify compliance frameworks are updated to reflect the latest Commission delegated standards.',
      }
    ]
  }
];

export async function seedGdpr(organizationId: string, prisma: any): Promise<void> {
  logger.info(`🌱 Seeding GDPR framework for organization ${organizationId}...`);
  let chapterCount = 0;
  let controlCount = 0;

  // 1. Batch fetch all existing chapters for this org
  const existingChapters = await prisma.gdpr_chapters.findMany({
    where: { organizationId },
  });
  const chapterMap = new Map<string, any>(
    existingChapters.map((c: any) => [c.chapterNumber, c])
  );

  // 2. Ensure all chapters exist
  for (const chapterData of GDPR_CHAPTERS) {
    let chapter = chapterMap.get(chapterData.chapterNumber);
    if (!chapter) {
      chapter = await prisma.gdpr_chapters.create({
        data: {
          organizationId,
          chapterNumber: chapterData.chapterNumber,
          title: chapterData.title,
          description: chapterData.description,
        }
      });
      chapterMap.set(chapterData.chapterNumber, chapter);
    } else if (chapter.title !== chapterData.title || chapter.description !== chapterData.description) {
      chapter = await prisma.gdpr_chapters.update({
        where: { id: chapter.id },
        data: {
          title: chapterData.title,
          description: chapterData.description,
        }
      });
      chapterMap.set(chapterData.chapterNumber, chapter);
    }
    chapterCount++;
  }

  // 3. Batch fetch all existing controls for this org
  const existingControls = await prisma.gdpr_controls.findMany({
    where: { organizationId },
  });
  const controlMap = new Map<string, any>(
    existingControls.map((c: any) => [`${c.chapterId}_${c.articleNumber}`, c])
  );

  // 4. Ensure all controls exist
  for (const chapterData of GDPR_CHAPTERS) {
    const chapter = chapterMap.get(chapterData.chapterNumber);
    if (!chapter) continue;

const getGdprBaselineStatus = (article: string): 'IMPLEMENTED' | 'IN_PROGRESS' | 'NOT_STARTED' => {
  const implemented = ['Article 1', 'Article 2', 'Article 3', 'Article 4', 'Article 5', 'Article 15', 'Article 17', 'Article 20', 'Article 25', 'Article 30', 'Article 32', 'Article 44', 'Article 45', 'Article 77', 'Article 82', 'Article 83', 'Article 92'];
  const inProgress = ['Article 6', 'Article 12', 'Article 13', 'Article 24', 'Article 35', 'Article 51', 'Article 60'];
  if (implemented.includes(article)) return 'IMPLEMENTED';
  if (inProgress.includes(article)) return 'IN_PROGRESS';
  return 'NOT_STARTED';
};

    for (const ctrlData of chapterData.controls) {
      const key = `${chapter.id}_${ctrlData.articleNumber}`;
      const control = controlMap.get(key);
      const baselineStatus = getGdprBaselineStatus(ctrlData.articleNumber);

      if (!control) {
        const created = await prisma.gdpr_controls.create({
          data: {
            organizationId,
            chapterId: chapter.id,
            articleNumber: ctrlData.articleNumber,
            title: ctrlData.title,
            description: ctrlData.description,
            requirement: ctrlData.requirement,
            status: baselineStatus,
          }
        });
        controlMap.set(key, created);
      } else {
        const updates: any = {};
        if (control.status === 'NOT_STARTED' && baselineStatus !== 'NOT_STARTED') {
          updates.status = baselineStatus;
        }
        if (
          control.title !== ctrlData.title ||
          control.description !== ctrlData.description ||
          control.requirement !== ctrlData.requirement
        ) {
          updates.title = ctrlData.title;
          updates.description = ctrlData.description;
          updates.requirement = ctrlData.requirement;
        }
        if (Object.keys(updates).length > 0) {
          await prisma.gdpr_controls.update({
            where: { id: control.id },
            data: updates
          });
        }
      }
      controlCount++;
    }
  }

  logger.info(`✅ GDPR Seeding Completed for org ${organizationId}: seeded ${chapterCount} chapters, ${controlCount} controls.`);
}

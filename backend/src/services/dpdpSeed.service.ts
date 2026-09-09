import logger from '../utils/logger';

export const DPDP_CHAPTERS = [
  {
    chapterNumber: 'Fiduciary',
    title: 'Data Fiduciary Obligations',
    description: 'Statutory responsibilities of Data Fiduciaries regarding processing, accuracy, security, and deletion of personal data (Section 8).',
    controls: [
      {
        articleNumber: 'Section 8(1)',
        title: 'Compliance Responsibility',
        description: 'A Data Fiduciary shall be responsible for complying with the provisions of this Act in respect of any processing.',
        requirement: 'Establish formal privacy governance structures and define ownership for processing operations.',
      },
      {
        articleNumber: 'Section 8(5)',
        title: 'Data Accuracy & Completeness',
        description: 'Ensure that personal data processed is accurate, complete, and updated when it impacts decisions or is shared.',
        requirement: 'Implement data sanity validations and validation logs before processing files in databases.',
      },
      {
        articleNumber: 'Section 8(6)',
        title: 'Reasonable Security Safeguards',
        description: 'Take reasonable security safeguards to prevent personal data breach, protecting CDE and other endpoints.',
        requirement: 'Enforce AES-256 encryption at rest, secure firewalls, and active endpoint access logs.',
      },
      {
        articleNumber: 'Section 8(7)',
        title: 'Breach Notification Obligations',
        description: 'In the event of a personal data breach, notify the Board and each affected Data Principal in the prescribed form.',
        requirement: 'Define breach detection workflows and incident notification templates to alert regulators within 24 hours.',
      },
      {
        articleNumber: 'Section 8(9)',
        title: 'Data Erasure and Retention',
        description: 'Erase personal data once the specified purpose is fulfilled or when consent is withdrawn by the Data Principal.',
        requirement: 'Deploy automated data retention monitors and scheduled cron cleanup scripts to delete expired records.',
      }
    ]
  },
  {
    chapterNumber: 'Principal Rights',
    title: 'Rights of Data Principals',
    description: 'Rights granted to individuals, including information access, correction, erasure, and grievance redressal (Sections 11–14).',
    controls: [
      {
        articleNumber: 'Section 11',
        title: 'Right to Access Information',
        description: 'Right to obtain a summary of personal data being processed, processing activities, and identities of fiduciaries.',
        requirement: 'Provide a customer privacy portal where users can request and download summaries of their personal data.',
      },
      {
        articleNumber: 'Section 12',
        title: 'Right to Correction & Erasure',
        description: 'Right to correction, completion, updating, and erasure of personal data for which consent was previously given.',
        requirement: 'Provide self-service or form-based intake flows to request correction or complete purging of profile databases.',
      },
      {
        articleNumber: 'Section 13',
        title: 'Right of Grievance Redressal',
        description: 'Right to have readily available, accessible, and time-bound grievance redressal mechanisms in place.',
        requirement: 'Integrate a ticketing ticketing platform to capture, route, and resolve user privacy complaints.',
      },
      {
        articleNumber: 'Section 14',
        title: 'Right to Nominate',
        description: 'Right to nominate any other individual to exercise rights on behalf of the Data Principal in event of death or incapacity.',
        requirement: 'Maintain nomination records and consent authorization frameworks in the user profile registry.',
      }
    ]
  },
  {
    chapterNumber: 'Consent Framework',
    title: 'Consent and Notice Controls',
    description: 'Notice requirements, consent specificity, and easy withdrawal mechanisms (Sections 5 & 6).',
    controls: [
      {
        articleNumber: 'Section 5',
        title: 'Notice for Consent Request',
        description: 'Provide notice prior to or along with consent, detailing personal data collected, processing purpose, and rights.',
        requirement: 'Integrate clear, bilingual privacy notice overlays at all user registration and onboarding pages.',
      },
      {
        articleNumber: 'Section 6(1)',
        title: 'Consent Validity Criteria',
        description: 'Consent must be free, specific, informed, unconditional, unambiguous, and signified by a clear affirmative action.',
        requirement: 'Configure explicit, opt-in check boxes rather than pre-checked selectors for data collection.',
      },
      {
        articleNumber: 'Section 6(4)',
        title: 'Right to Withdraw Consent',
        description: 'Allow Data Principals to withdraw consent as easily as it was given, with immediate processing halting.',
        requirement: 'Provide a simple, single-click opt-out interface and sync changes instantly to system databases.',
      }
    ]
  },
  {
    chapterNumber: 'Localisation',
    title: 'Localisation & Cross-border Flows',
    description: 'Rules governing transmission of personal data outside Indian territories (Section 16).',
    controls: [
      {
        articleNumber: 'Section 16',
        title: 'Cross-border Transfer Restrictions',
        description: 'Restrict transfer of personal data to countries or territories outside India as notified by the Central Government.',
        requirement: 'Implement geo-fencing controls on cloud database storage and restrict replication to foreign availability zones.',
      }
    ]
  },
  {
    chapterNumber: 'Redressal',
    title: 'Compliance Audits & Significant Fiduciaries',
    description: 'Obligations of Significant Data Fiduciaries, Data Protection Officers, and grievance redressal (Sections 10 & 15).',
    controls: [
      {
        articleNumber: 'Section 10',
        title: 'Significant Data Fiduciary Obligations',
        description: 'Appoint a Data Protection Officer (DPO), hire independent auditors, and perform periodic DPIAs and audits.',
        requirement: 'Appoint a qualified DPO, contract annual compliance audits, and carry out formal impact assessments.',
      },
      {
        articleNumber: 'Section 15',
        title: 'Grievance Officer Appointment',
        description: 'Appoint a local Grievance Officer in India to address user inquiries and grievances within statutory timelines.',
        requirement: 'Formally designate a local Grievance Officer and publish their contact information on the public website.',
      }
    ]
  }
];

export async function seedDpdp(organizationId: string, prisma: any): Promise<void> {
  logger.info(`🌱 Seeding DPDP framework for organization ${organizationId}...`);
  let chapterCount = 0;
  let controlCount = 0;

  // 1. Batch fetch all existing chapters for this org
  const existingChapters = await prisma.dpdpChapter.findMany({
    where: { organizationId },
  });
  const chapterMap = new Map<string, any>(
    existingChapters.map((c: any) => [c.chapterNumber, c])
  );

  // 2. Ensure all chapters exist
  for (const chapterData of DPDP_CHAPTERS) {
    let chapter = chapterMap.get(chapterData.chapterNumber);
    if (!chapter) {
      chapter = await prisma.dpdpChapter.create({
        data: {
          organizationId,
          chapterNumber: chapterData.chapterNumber,
          title: chapterData.title,
          description: chapterData.description,
        }
      });
      chapterMap.set(chapterData.chapterNumber, chapter);
    } else if (chapter.title !== chapterData.title || chapter.description !== chapterData.description) {
      chapter = await prisma.dpdpChapter.update({
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
  const existingControls = await prisma.dpdpControl.findMany({
    where: { organizationId },
  });
  const controlMap = new Map<string, any>(
    existingControls.map((c: any) => [`${c.chapterId}_${c.articleNumber}`, c])
  );

  // 4. Ensure all controls exist
  for (const chapterData of DPDP_CHAPTERS) {
    const chapter = chapterMap.get(chapterData.chapterNumber);
    if (!chapter) continue;

    for (const ctrlData of chapterData.controls) {
      const key = `${chapter.id}_${ctrlData.articleNumber}`;
      const control = controlMap.get(key);

      if (!control) {
        const created = await prisma.dpdpControl.create({
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
        controlMap.set(key, created);
      } else if (
        control.title !== ctrlData.title ||
        control.description !== ctrlData.description ||
        control.requirement !== ctrlData.requirement
      ) {
        await prisma.dpdpControl.update({
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

  logger.info(`✅ DPDP Seeding Completed for org ${organizationId}: seeded ${chapterCount} chapters, ${controlCount} controls.`);
}

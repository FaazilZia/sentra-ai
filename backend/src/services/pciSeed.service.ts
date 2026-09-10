import logger from '../utils/logger';

export const PCI_CHAPTERS = [
  {
    chapterNumber: 'Network Security',
    title: 'Secure Networks & Configurations',
    description: 'Establish and maintain network security controls and secure system configuration standards (Requirements 1 & 2).',
    controls: [
      {
        articleNumber: 'Requirement 1.2',
        title: 'Network Security Controls',
        description: 'Establish and implement network security controls to restrict traffic flow between trusted and untrusted networks.',
        requirement: 'Deploy boundary protection rules and firewalls restricting traffic to production CDE environments.',
      },
      {
        articleNumber: 'Requirement 1.3',
        title: 'CDE Access Controls',
        description: 'Restrict access to the cardholder data environment (CDE) to authorized system components only.',
        requirement: 'Enforce strict routing protocols and segregate the CDE from internal development zones.',
      },
      {
        articleNumber: 'Requirement 2.2',
        title: 'System Configuration Standards',
        description: 'Configure system components in accordance with industry-accepted hardening standards.',
        requirement: 'Establish configuration baselines and disable unnecessary protocols, ports, and services on all systems.',
      }
    ]
  },
  {
    chapterNumber: 'Data Protection',
    title: 'Cardholder Data Protection',
    description: 'Protect stored account data and enforce cryptographic transmission controls (Requirements 3 & 4).',
    controls: [
      {
        articleNumber: 'Requirement 3.2',
        title: 'Account Data Storage Minimization',
        description: 'Limit stored cardholder data to that which is strictly necessary for legal, regulatory, or business needs.',
        requirement: 'Configure automated database pruning routines and delete legacy transaction payloads weekly.',
      },
      {
        articleNumber: 'Requirement 3.4',
        title: 'PAN Encryption at Rest',
        description: 'Render primary account numbers (PAN) unreadable anywhere it is stored, using strong cryptography.',
        requirement: 'Encrypt PAN records using AES-256 block-level encryption and establish strict KMS key rotations.',
      },
      {
        articleNumber: 'Requirement 4.2',
        title: 'Data Transmission Encryption',
        description: 'Protect cardholder data during transmission across open, public networks using strong cryptography.',
        requirement: 'Enforce TLS 1.3 encryption for all public API endpoints handling transaction data.',
      }
    ]
  },
  {
    chapterNumber: 'Vulnerability Management',
    title: 'Vulnerability & Software Governance',
    description: 'Protect systems from malware, secure software development, and run risk assessments (Requirements 5 & 6).',
    controls: [
      {
        articleNumber: 'Requirement 5.2',
        title: 'Anti-Malware Protections',
        description: 'Deploy and maintain anti-malware mechanisms on all system components commonly affected by malicious software.',
        requirement: 'Install real-time anti-malware agents on production instances and centralize log reporting.',
      },
      {
        articleNumber: 'Requirement 6.2',
        title: 'Vulnerability Identification',
        description: 'Identify security vulnerabilities using reputable outside sources and assign a risk ranking.',
        requirement: 'Maintain a registered asset catalog and run monthly CVE vulnerability scans.',
      },
      {
        articleNumber: 'Requirement 6.3',
        title: 'Secure Software Development',
        description: 'Develop software applications securely based on industry-accepted standards and verify before release.',
        requirement: 'Enforce automated dependency checking and static application security testing (SAST) in CI/CD.',
      }
    ]
  },
  {
    chapterNumber: 'Access Control',
    title: 'Logical & Physical Access Restrictions',
    description: 'Restrict access to CDE by business need-to-know, authenticate users, and manage physical sites (Requirements 7, 8 & 9).',
    controls: [
      {
        articleNumber: 'Requirement 7.2',
        title: 'Least Privilege Logical Access',
        description: 'Restrict access to system components and cardholder data to individuals with a business need-to-know.',
        requirement: 'Deploy role-based access control (RBAC) mapping employees and systems to authorized scopes.',
      },
      {
        articleNumber: 'Requirement 8.2',
        title: 'User Authentication & Credentials',
        description: 'Identify and authenticate all users prior to granting access to CDE system components.',
        requirement: 'Require unique user IDs and enforce password complexity parameters across all directories.',
      },
      {
        articleNumber: 'Requirement 8.3',
        title: 'Multi-Factor Authentication',
        description: 'Enforce multi-factor authentication (MFA) for all administrative and remote system access.',
        requirement: 'Mandate MFA for all interactive console logins and database administrator access.',
      },
      {
        articleNumber: 'Requirement 9.2',
        title: 'Physical Access Controls',
        description: 'Limit and monitor physical access to systems in the CDE using physical barriers and log tags.',
        requirement: 'Secure physical server racks with biometric logs and preserve entry records for at least 90 days.',
      }
    ]
  },
  {
    chapterNumber: 'Monitoring & Testing',
    title: 'Logging, Monitoring & Security Assessments',
    description: 'Track and monitor all access to network resources, check logs, and run testing processes (Requirements 10 & 11).',
    controls: [
      {
        articleNumber: 'Requirement 10.2',
        title: 'Audit Log Generation',
        description: 'Implement audit trails to detect and track user access and modifications within CDE resources.',
        requirement: 'Configure centralized system logging capturing authentication attempts and schema edits.',
      },
      {
        articleNumber: 'Requirement 10.4',
        title: 'Audit Trail Protection',
        description: 'Protect audit logs from unauthorized modifications or deletions.',
        requirement: 'Forward logs to write-once-read-many (WORM) storage systems and restrict access.',
      },
      {
        articleNumber: 'Requirement 11.2',
        title: 'Vulnerability Scanning Programs',
        description: 'Run internal and external network vulnerability scans regularly.',
        requirement: 'Perform quarterly internal scans and engage an Approved Scanning Vendor (ASV) for external scans.',
      },
      {
        articleNumber: 'Requirement 11.3',
        title: 'Penetration Testing Requirements',
        description: 'Execute external and internal penetration testing annually or after any significant system change.',
        requirement: 'Contract certified third-party firms to conduct annual penetration tests of the CDE boundaries.',
      }
    ]
  },
  {
    chapterNumber: 'Information Security Policies',
    title: 'Policy Governance & Incident Response',
    description: 'Support security policies and establish incident response management workflows (Requirement 12).',
    controls: [
      {
        articleNumber: 'Requirement 12.1',
        title: 'Information Security Policy Maintenance',
        description: 'Establish, publish, and maintain an information security policy that addresses all PCI-DSS requirements.',
        requirement: 'Review and republish formal organization security policies annually with executive sign-off.',
      },
      {
        articleNumber: 'Requirement 12.10',
        title: 'Incident Response Management',
        description: 'Establish and be ready to immediately implement an incident response plan to address any breach of data.',
        requirement: 'Formulate a detailed incident response plan and run simulated breach exercises annually.',
      }
    ]
  }
];

export async function seedPci(organizationId: string, prisma: any): Promise<void> {
  logger.info(`🌱 Seeding PCI-DSS framework for organization ${organizationId}...`);
  let chapterCount = 0;
  let controlCount = 0;

  // 1. Batch fetch all existing chapters for this org
  const existingChapters = await prisma.pciChapter.findMany({
    where: { organizationId },
  });
  const chapterMap = new Map<string, any>(
    existingChapters.map((c: any) => [c.chapterNumber, c])
  );

  // 2. Ensure all chapters exist
  for (const chapterData of PCI_CHAPTERS) {
    let chapter = chapterMap.get(chapterData.chapterNumber);
    if (!chapter) {
      chapter = await prisma.pciChapter.create({
        data: {
          organizationId,
          chapterNumber: chapterData.chapterNumber,
          title: chapterData.title,
          description: chapterData.description,
        }
      });
      chapterMap.set(chapterData.chapterNumber, chapter);
    } else if (chapter.title !== chapterData.title || chapter.description !== chapterData.description) {
      chapter = await prisma.pciChapter.update({
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
  const existingControls = await prisma.pciControl.findMany({
    where: { organizationId },
  });
  const controlMap = new Map<string, any>(
    existingControls.map((c: any) => [`${c.chapterId}_${c.articleNumber}`, c])
  );

  // 4. Ensure all controls exist
  for (const chapterData of PCI_CHAPTERS) {
    const chapter = chapterMap.get(chapterData.chapterNumber);
    if (!chapter) continue;

const getPciBaselineStatus = (article: string): 'IMPLEMENTED' | 'IN_PROGRESS' | 'NOT_STARTED' => {
  const implemented = [
    'Requirement 3.2',
    'Requirement 3.4',
    'Requirement 4.2',
    'Requirement 6.2',
    'Requirement 7.2',
    'Requirement 8.2',
    'Requirement 8.3',
    'Requirement 10.2',
    'Requirement 10.4',
    'Requirement 11.2',
    'Requirement 12.10',
  ];
  const inProgress = ['Requirement 1.2', 'Requirement 1.3', 'Requirement 2.2', 'Requirement 5.2'];
  if (implemented.includes(article)) return 'IMPLEMENTED';
  if (inProgress.includes(article)) return 'IN_PROGRESS';
  return 'NOT_STARTED';
};

    for (const ctrlData of chapterData.controls) {
      const key = `${chapter.id}_${ctrlData.articleNumber}`;
      const control = controlMap.get(key);
      const baselineStatus = getPciBaselineStatus(ctrlData.articleNumber);

      if (!control) {
        const created = await prisma.pciControl.create({
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
          await prisma.pciControl.update({
            where: { id: control.id },
            data: updates
          });
        }
      }
      controlCount++;
    }
  }

  logger.info(`✅ PCI-DSS Seeding Completed for org ${organizationId}: seeded ${chapterCount} chapters, ${controlCount} controls.`);
}

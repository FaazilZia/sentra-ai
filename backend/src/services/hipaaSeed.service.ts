import logger from '../utils/logger';

export const HIPAA_CHAPTERS = [
  {
    chapterNumber: 'Administrative',
    title: 'Administrative Safeguards',
    description: 'Security management processes, risk analysis, information access management, and security awareness training (§164.308).',
    controls: [
      {
        articleNumber: '§164.308(a)(1)(ii)(A)',
        title: 'Risk Analysis',
        description: 'Conduct an accurate and thorough assessment of the potential risks and vulnerabilities to the confidentiality, integrity, and availability of electronic protected health information (ePHI).',
        requirement: 'Perform annual comprehensive risk assessments across all systems containing ePHI or utilized by AI agents.',
      },
      {
        articleNumber: '§164.308(a)(1)(ii)(B)',
        title: 'Risk Management',
        description: 'Implement security measures sufficient to reduce risks and vulnerabilities to a reasonable and appropriate level.',
        requirement: 'Establish guardrails and automated blocking filters for unauthorized ePHI database queries.',
      },
      {
        articleNumber: '§164.308(a)(3)',
        title: 'Workforce Security',
        description: 'Ensure that all members of its workforce have appropriate access to electronic protected health information, and prevent unauthorized access.',
        requirement: 'Maintain role-based access control (RBAC) mapping system users and agents to specific ePHI scopes.',
      },
      {
        articleNumber: '§164.308(a)(4)',
        title: 'Information Access Management',
        description: 'Implement policies and procedures for authorizing, establishing, documenting, and modifying access to ePHI.',
        requirement: 'Enforce access authorization policies and isolate databases holding healthcare records.',
      }
    ]
  },
  {
    chapterNumber: 'Physical',
    title: 'Physical Safeguards',
    description: 'Facility access controls, workstation security, and device controls (§164.310).',
    controls: [
      {
        articleNumber: '§164.310(a)(1)',
        title: 'Facility Access Controls',
        description: 'Limit physical access to its electronic information systems and the facility or facilities in which they are housed.',
        requirement: 'Ensure physical data center facilities and servers have strict biometric controls and audit logs.',
      },
      {
        articleNumber: '§164.310(b)',
        title: 'Workstation Use',
        description: 'Specify the proper functions to be performed, the manner in which those functions are to be performed, and the physical attributes of workstations.',
        requirement: 'Establish secure local workstation access guidelines and automated idle locks.',
      },
      {
        articleNumber: '§164.310(d)(1)',
        title: 'Device and Media Controls',
        description: 'Govern the receipt and removal of hardware and electronic media that contain ePHI into and out of a facility.',
        requirement: 'Implement standard operational protocols for media disposal and cryptographic sanitization of decommissioned drives.',
      }
    ]
  },
  {
    chapterNumber: 'Technical',
    title: 'Technical Safeguards',
    description: 'Access controls, audit controls, integrity, and transmission security (§164.312).',
    controls: [
      {
        articleNumber: '§164.312(a)(1)',
        title: 'Unique User Identification',
        description: 'Assign a unique name and/or number for identifying and tracking user identity.',
        requirement: 'Enforce unique credentials and token parameters for all interactive users and agent pipelines.',
      },
      {
        articleNumber: '§164.312(a)(2)(ii)',
        title: 'Emergency Access Procedure',
        description: 'Establish procedures for obtaining necessary electronic protected health information during an emergency.',
        requirement: 'Deploy secure breakout/emergency credentials with real-time audit logging.',
      },
      {
        articleNumber: '§164.312(b)',
        title: 'Audit Controls',
        description: 'Implement hardware, software, and/or procedural mechanisms that record and examine activity in systems that contain ePHI.',
        requirement: 'Ensure all LLM actions and DB queries are audited and kept in immutable access logs.',
      },
      {
        articleNumber: '§164.312(c)(1)',
        title: 'Mechanism to Authenticate ePHI',
        description: 'Implement policies and procedures to protect electronic protected health information from improper alteration or destruction.',
        requirement: 'Apply database integrity checks, hash validations, and write-once storage logs.',
      },
      {
        articleNumber: '§164.312(e)(1)',
        title: 'Transmission Security',
        description: 'Guard against unauthorized access to electronic protected health information that is being transmitted over an electronic communications network.',
        requirement: 'Enforce TLS 1.3 encryption for all communications and REST API requests holding patient telemetry.',
      }
    ]
  },
  {
    chapterNumber: 'Breach',
    title: 'Breach Notification Safeguards',
    description: 'Notification requirements following a breach of unsecured protected health information (§164.400–414).',
    controls: [
      {
        articleNumber: '§164.404',
        title: 'Notification to Individuals',
        description: 'Notify affected individuals of a breach of unsecured protected health information without unreasonable delay and in no case later than 60 calendar days.',
        requirement: 'Establish incident response playbook for swift customer alert notification.',
      },
      {
        articleNumber: '§164.406',
        title: 'Notification to the Media',
        description: 'Provide notice to prominent media outlets serving a State or jurisdiction following a breach affecting more than 500 residents.',
        requirement: 'Appoint public relations leads and draft breach notification templates.',
      },
      {
        articleNumber: '§164.408',
        title: 'Notification to the Secretary',
        description: 'Notify the Secretary of HHS of breaches. For breaches of 500 or more individuals, notify contemporaneously with notice to individuals.',
        requirement: 'Register HHS portal credentials and maintain compliance notification workflows.',
      }
    ]
  },
  {
    chapterNumber: 'Privacy',
    title: 'Privacy Safeguards',
    description: 'Uses and disclosures of PHI, consent management, minimum necessary standard, and data rights (§164.500–534).',
    controls: [
      {
        articleNumber: '§164.502(b)',
        title: 'Minimum Necessary Standard',
        description: 'Make reasonable efforts to limit protected health information to the minimum necessary to accomplish the intended purpose of the use, disclosure, or request.',
        requirement: 'Deploy automated de-identification, tokenization, or masking filters on LLM prompts and responses.',
      },
      {
        articleNumber: '§164.508',
        title: 'Authorizations for Uses & Disclosures',
        description: 'Obtain patient authorization for any use or disclosure of PHI that is not otherwise permitted by the Privacy Rule.',
        requirement: 'Implement consent state checking in database connectors before sharing personal identifiers.',
      },
      {
        articleNumber: '§164.524',
        title: 'Access of Individuals to PHI',
        description: 'Provide individuals with access to inspect and obtain a copy of their protected health information.',
        requirement: 'Build consumer portal requesting capabilities allowing health records export.',
      },
      {
        articleNumber: '§164.526',
        title: 'Amendment of PHI',
        description: 'Permit individuals to request amendments to their protected health information.',
        requirement: 'Define protocols for processing and registering correction modifications in the health registry.',
      }
    ]
  },
  {
    chapterNumber: 'Enforcement',
    title: 'Enforcement & Compliance',
    description: 'Investigations, compliance reviews, and penalties for violations (§160.300–426).',
    controls: [
      {
        articleNumber: '§160.306',
        title: 'Complaints to the Secretary',
        description: 'A person who believes a covered entity or business associate is not complying may file a complaint with the Secretary.',
        requirement: 'Maintain documented operational compliance records to resolve HHS audit requests.',
      }
    ]
  }
];

export async function seedHipaa(organizationId: string, prisma: any): Promise<void> {
  logger.info(`🌱 Seeding HIPAA framework for organization ${organizationId}...`);
  let chapterCount = 0;
  let controlCount = 0;

  for (const chapterData of HIPAA_CHAPTERS) {
    let chapter = await prisma.hipaaChapter.findFirst({
      where: {
        organizationId,
        chapterNumber: chapterData.chapterNumber,
      }
    });

    if (!chapter) {
      chapter = await prisma.hipaaChapter.create({
        data: {
          organizationId,
          chapterNumber: chapterData.chapterNumber,
          title: chapterData.title,
          description: chapterData.description,
        }
      });
    } else {
      chapter = await prisma.hipaaChapter.update({
        where: { id: chapter.id },
        data: {
          title: chapterData.title,
          description: chapterData.description,
        }
      });
    }
    chapterCount++;

    for (const ctrlData of chapterData.controls) {
      const control = await prisma.hipaaControl.findFirst({
        where: {
          organizationId,
          chapterId: chapter.id,
          articleNumber: ctrlData.articleNumber,
        }
      });

      if (!control) {
        await prisma.hipaaControl.create({
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
        await prisma.hipaaControl.update({
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

  logger.info(`✅ HIPAA Seeding Completed for org ${organizationId}: seeded ${chapterCount} chapters, ${controlCount} controls.`);
}

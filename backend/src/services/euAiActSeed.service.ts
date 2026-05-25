import { PrismaClient } from '@prisma/client';

export const EU_AI_ACT_SEED_DATA = [
  {
    article_number: "Art. 5",
    title: "Prohibited AI Practices",
    chapter: "Chapter II - Prohibited AI Practices",
    risk_tier: "PROHIBITED",
    obligation_type: "BOTH",
    description: "AI systems that pose unacceptable risks are prohibited. Includes subliminal manipulation, exploitation of vulnerabilities, social scoring by public authorities, and real-time biometric identification in public spaces.",
    controls: [
      {
        control_code: "EU-AIA-5-1",
        title: "No Subliminal Manipulation",
        description: "AI system must not deploy subliminal techniques beyond a person's consciousness to materially distort behaviour in a manner that causes or is likely to cause physical or psychological harm.",
        evidence_required: ["System design documentation showing absence of subliminal techniques", "Independent technical audit report"],
        checklist_items: ["Review all persuasion mechanisms in the AI system", "Document that no subliminal or manipulative techniques are used", "Obtain legal sign-off on system design"]
      },
      {
        control_code: "EU-AIA-5-2",
        title: "No Exploitation of Vulnerabilities",
        description: "AI system must not exploit vulnerabilities of specific groups (age, disability, social/economic situation) to distort behaviour causing harm.",
        evidence_required: ["Bias and vulnerability assessment report", "Targeted user group analysis"],
        checklist_items: ["Conduct vulnerability assessment for target user groups", "Document safeguards for vulnerable populations", "Review system outputs for discriminatory targeting"]
      },
      {
        control_code: "EU-AIA-5-3",
        title: "No Unlawful Social Scoring",
        description: "Public authorities must not use AI for social scoring of natural persons leading to detrimental or unfavourable treatment.",
        evidence_required: ["Scope of deployment declaration", "Legal basis documentation"],
        checklist_items: ["Confirm system is not used by public authorities for social scoring", "Document intended deployment scope and restrictions"]
      }
    ]
  },
  {
    article_number: "Art. 9",
    title: "Risk Management System",
    chapter: "Chapter III - High-Risk AI Systems",
    risk_tier: "HIGH_RISK",
    obligation_type: "PROVIDER",
    description: "Providers of high-risk AI systems must establish, implement, document and maintain a risk management system throughout the AI system lifecycle.",
    controls: [
      {
        control_code: "EU-AIA-9-1",
        title: "Risk Management Process Established",
        description: "A continuous iterative risk management process must be established covering identification, estimation, evaluation, and mitigation of known and foreseeable risks.",
        evidence_required: ["Risk management policy document", "Risk register with identified risks", "Mitigation measures documentation"],
        checklist_items: ["Create and document risk management policy", "Maintain a live risk register for the AI system", "Document risk mitigation measures for each identified risk", "Schedule regular risk reviews"]
      },
      {
        control_code: "EU-AIA-9-2",
        title: "Residual Risk Evaluation",
        description: "Residual risks after mitigation must be judged acceptable. Inform users of relevant residual risks.",
        evidence_required: ["Residual risk assessment report", "User documentation disclosing residual risks"],
        checklist_items: ["Assess residual risk after all mitigations applied", "Determine acceptability of residual risk", "Include residual risks in user-facing documentation"]
      },
      {
        control_code: "EU-AIA-9-3",
        title: "Testing Against Risk Criteria",
        description: "Testing procedures must ensure consistent performance against risk management measures throughout development and before market placement.",
        evidence_required: ["Test plans and results", "Pre-deployment test reports", "Regression test results"],
        checklist_items: ["Define test criteria linked to identified risks", "Conduct and document pre-deployment testing", "Maintain test result history for audit"]
      }
    ]
  },
  {
    article_number: "Art. 10",
    title: "Data and Data Governance",
    chapter: "Chapter III - High-Risk AI Systems",
    risk_tier: "HIGH_RISK",
    obligation_type: "PROVIDER",
    description: "Training, validation, and testing data must meet quality criteria. Data governance practices must cover collection, examination, and processing to detect biases.",
    controls: [
      {
        control_code: "EU-AIA-10-1",
        title: "Data Quality Criteria",
        description: "Training, validation and testing datasets must be relevant, representative, free from errors and complete for the intended purpose.",
        evidence_required: ["Data quality assessment report", "Dataset documentation (data cards)", "Bias evaluation report"],
        checklist_items: ["Document all training, validation, and test datasets", "Conduct data quality assessment", "Evaluate datasets for bias and gaps", "Maintain data cards for each dataset"]
      },
      {
        control_code: "EU-AIA-10-2",
        title: "Data Governance Practices",
        description: "Relevant data governance and management practices must be followed including collection purpose, data processing operations, and data preparation annotations.",
        evidence_required: ["Data governance policy", "Data lineage documentation", "Data processing records"],
        checklist_items: ["Establish data governance policy", "Document data collection purpose and legal basis", "Track data lineage from source to training", "Document all data preparation and annotation steps"]
      },
      {
        control_code: "EU-AIA-10-3",
        title: "Personal Data Minimisation",
        description: "Where personal data is processed in datasets, appropriate technical measures must minimise data use and protect individual rights.",
        evidence_required: ["Data minimisation impact assessment", "Pseudonymisation/anonymisation documentation", "DPIA if applicable"],
        checklist_items: ["Implement data minimisation in all datasets", "Apply pseudonymisation or anonymisation where possible", "Conduct Data Protection Impact Assessment if required", "Document technical measures applied"]
      }
    ]
  },
  {
    article_number: "Art. 11",
    title: "Technical Documentation",
    chapter: "Chapter III - High-Risk AI Systems",
    risk_tier: "HIGH_RISK",
    obligation_type: "PROVIDER",
    description: "Providers must draw up technical documentation before placing the AI system on the market. Must be kept up-to-date and demonstrate compliance with requirements.",
    controls: [
      {
        control_code: "EU-AIA-11-1",
        title: "Technical Documentation Completeness",
        description: "Technical documentation must include general description, detailed description of elements and development process, monitoring/functioning/control information, and validation and testing information.",
        evidence_required: ["Technical documentation package (Annex IV compliant)", "Version history of documentation", "Document review sign-off"],
        checklist_items: ["Create technical documentation per Annex IV requirements", "Include system architecture diagrams", "Document training methodology and datasets", "Document performance metrics and testing results", "Keep documentation current with each system update"]
      },
      {
        control_code: "EU-AIA-11-2",
        title: "AI System Bill of Materials (AI-BOM)",
        description: "Documentation must include a list of components and their descriptions, including third-party AI components.",
        evidence_required: ["AI-BOM listing all components, libraries, and dependencies", "Third-party component compliance declarations"],
        checklist_items: ["Generate and maintain AI-BOM", "List all AI/ML libraries with versions", "Document all third-party AI APIs and models", "Review and update AI-BOM on each release"]
      }
    ]
  },
  {
    article_number: "Art. 13",
    title: "Transparency and Provision of Information",
    chapter: "Chapter III - High-Risk AI Systems",
    risk_tier: "HIGH_RISK",
    obligation_type: "PROVIDER",
    description: "High-risk AI systems must be designed to ensure sufficient transparency to enable deployers to interpret outputs and use appropriately. Instructions for use must be provided.",
    controls: [
      {
        control_code: "EU-AIA-13-1",
        title: "System Transparency Design",
        description: "AI system must be sufficiently transparent to allow deployers to understand and appropriately use it. Outputs must be interpretable.",
        evidence_required: ["Explainability documentation", "Model interpretability assessment", "Sample output explanations"],
        checklist_items: ["Document how system outputs are generated", "Provide output interpretation guidance", "Implement explainability mechanisms where applicable", "Test that outputs are understandable to intended deployers"]
      },
      {
        control_code: "EU-AIA-13-2",
        title: "Instructions for Use",
        description: "Instructions must include identity and contact of provider, system capabilities and limitations, performance metrics, human oversight measures needed, and expected lifetime.",
        evidence_required: ["Instructions for Use document", "Limitations and contraindications documentation", "Human oversight guidance"],
        checklist_items: ["Write and publish Instructions for Use", "Document system capabilities and known limitations", "Specify human oversight requirements", "Include accuracy/performance metrics in documentation", "State expected lifetime and maintenance schedule"]
      },
      {
        control_code: "EU-AIA-13-3",
        title: "Input Data Requirements Disclosure",
        description: "Specifications, formats, and nature of input data required for the system to function as intended must be documented.",
        evidence_required: ["Input data specification document", "Data format requirements documentation"],
        checklist_items: ["Document all required input data formats", "Specify data quality requirements for correct operation", "Document edge cases and unsupported input types"]
      }
    ]
  },
  {
    article_number: "Art. 14",
    title: "Human Oversight",
    chapter: "Chapter III - High-Risk AI Systems",
    risk_tier: "HIGH_RISK",
    obligation_type: "BOTH",
    description: "High-risk AI systems must be designed to allow effective human oversight. Deployers must assign oversight to natural persons with necessary competence, authority, and resources.",
    controls: [
      {
        control_code: "EU-AIA-14-1",
        title: "Human Override Capability",
        description: "System must allow overseeing persons to fully understand the system's capabilities and limitations and to intervene or interrupt via stop button or similar.",
        evidence_required: ["Override mechanism documentation", "Emergency stop procedure", "Human oversight interface documentation"],
        checklist_items: ["Implement human override / stop mechanism", "Document override procedures", "Test override functionality", "Train oversight personnel on override procedures"]
      },
      {
        control_code: "EU-AIA-14-2",
        title: "Oversight Personnel Assignment",
        description: "Deployers must assign human oversight to persons with necessary competence, authority, and resources.",
        evidence_required: ["Oversight role assignment documentation", "Competence assessment records", "Training records for oversight personnel"],
        checklist_items: ["Formally assign human oversight roles", "Assess competence of assigned oversight personnel", "Provide training on AI system for oversight staff", "Document authority and resources allocated to oversight"]
      },
      {
        control_code: "EU-AIA-14-3",
        title: "Automation Bias Mitigation",
        description: "Oversight measures must account for automation bias — the tendency of humans to over-rely on automated system outputs.",
        evidence_required: ["Automation bias training materials", "Oversight procedure requiring independent judgment"],
        checklist_items: ["Train oversight personnel on automation bias risks", "Design workflows requiring active human judgment, not rubber-stamping", "Document automation bias mitigation measures"]
      }
    ]
  },
  {
    article_number: "Art. 15",
    title: "Accuracy, Robustness and Cybersecurity",
    chapter: "Chapter III - High-Risk AI Systems",
    risk_tier: "HIGH_RISK",
    obligation_type: "PROVIDER",
    description: "High-risk AI systems must achieve appropriate levels of accuracy, robustness, and cybersecurity, and perform consistently throughout their lifecycle.",
    controls: [
      {
        control_code: "EU-AIA-15-1",
        title: "Accuracy Levels Declared",
        description: "Accuracy levels and relevant accuracy metrics must be declared in the instructions for use.",
        evidence_required: ["Accuracy benchmarks documentation", "Performance evaluation report", "Metric definitions"],
        checklist_items: ["Define accuracy metrics relevant to the use case", "Benchmark and document accuracy levels", "Include accuracy metrics in Instructions for Use", "Track accuracy degradation over time"]
      },
      {
        control_code: "EU-AIA-15-2",
        title: "Resilience Against Errors and Faults",
        description: "System must be resilient against errors, faults, and inconsistencies in inputs. Technical redundancy solutions including fallbacks and fail-safe plans must be implemented.",
        evidence_required: ["Fault tolerance design documentation", "Failover test results", "Degraded mode specification"],
        checklist_items: ["Implement fail-closed or safe degraded mode", "Test system behaviour under error conditions", "Document fallback procedures", "Implement input validation and error handling"]
      },
      {
        control_code: "EU-AIA-15-3",
        title: "AI-Specific Cybersecurity",
        description: "Systems must resist attempts to exploit vulnerabilities by third parties including adversarial attacks, data poisoning, model poisoning, and confidentiality attacks.",
        evidence_required: ["AI security assessment report", "Adversarial robustness testing results", "Credential management documentation"],
        checklist_items: ["Conduct adversarial robustness testing", "Implement defences against prompt injection", "Protect against data and model poisoning", "Secure all API keys and credentials with rotation policy", "Monitor for anomalous input patterns"]
      }
    ]
  },
  {
    article_number: "Art. 17",
    title: "Quality Management System",
    chapter: "Chapter III - High-Risk AI Systems",
    risk_tier: "HIGH_RISK",
    obligation_type: "PROVIDER",
    description: "Providers of high-risk AI systems must put a quality management system in place ensuring compliance with the Regulation. The system must be documented in systematic and orderly written policies, procedures and instructions.",
    controls: [
      {
        control_code: "EU-AIA-17-1",
        title: "QMS Documentation",
        description: "Quality management strategy and procedures must be documented in writing including strategy for regulatory compliance.",
        evidence_required: ["QMS policy document", "Quality procedures manual", "Regulatory compliance strategy"],
        checklist_items: ["Document quality management strategy", "Write quality procedures manual", "Establish regulatory compliance procedures", "Assign QMS ownership and responsibilities"]
      },
      {
        control_code: "EU-AIA-17-2",
        title: "Post-Market Monitoring Integration",
        description: "QMS must include procedures for post-market monitoring data collection, analysis, and reporting.",
        evidence_required: ["Post-market monitoring plan", "Reporting procedures", "Incident escalation process"],
        checklist_items: ["Establish post-market monitoring plan", "Define data collection procedures for deployed system", "Set up incident reporting to relevant authorities", "Schedule periodic QMS reviews"]
      }
    ]
  },
  {
    article_number: "Art. 50",
    title: "Transparency Obligations for Providers and Deployers of Certain AI Systems",
    chapter: "Chapter IV - Transparency Obligations",
    risk_tier: "LIMITED_RISK",
    obligation_type: "BOTH",
    description: "Providers of AI systems interacting with humans must ensure persons are informed they are interacting with an AI. AI-generated content must be machine-readable marked as artificially generated.",
    controls: [
      {
        control_code: "EU-AIA-50-1",
        title: "AI Interaction Disclosure",
        description: "Natural persons interacting with an AI system must be informed they are interacting with an AI, unless this is obvious from context.",
        evidence_required: ["UI disclosure implementation evidence", "User notification design documentation"],
        checklist_items: ["Implement clear AI disclosure in all user interfaces", "Ensure disclosure appears before or at start of AI interaction", "Test that disclosure is visible and understandable", "Document exemptions if AI nature is contextually obvious"]
      },
      {
        control_code: "EU-AIA-50-2",
        title: "Synthetic Content Labelling",
        description: "AI-generated or manipulated image, audio, or video content must be labelled as artificially generated in machine-readable format.",
        evidence_required: ["Content labelling implementation documentation", "Machine-readable metadata specification"],
        checklist_items: ["Implement machine-readable labelling for AI-generated content", "Apply labels to all synthetic images, audio, and video", "Verify labelling persists through content distribution", "Document technical implementation of labelling"]
      }
    ]
  },
  {
    article_number: "Art. 72",
    title: "Post-Market Monitoring",
    chapter: "Chapter IX - Post-Market Monitoring, Serious Incidents",
    risk_tier: "HIGH_RISK",
    obligation_type: "PROVIDER",
    description: "Providers must establish and document a post-market monitoring system proportionate to the nature of AI technologies and risks to collect and review experience gained from deployed high-risk AI systems.",
    controls: [
      {
        control_code: "EU-AIA-72-1",
        title: "Post-Market Monitoring Plan",
        description: "A post-market monitoring plan must be established, implemented, and documented before market placement.",
        evidence_required: ["Post-market monitoring plan document", "KPIs and thresholds for monitoring", "Data collection methodology"],
        checklist_items: ["Write post-market monitoring plan", "Define KPIs and alert thresholds", "Establish data collection from deployed system", "Schedule monitoring review cadence"]
      },
      {
        control_code: "EU-AIA-72-2",
        title: "Serious Incident Reporting",
        description: "Providers must report serious incidents and malfunctioning of high-risk AI systems to relevant national authorities without undue delay.",
        evidence_required: ["Incident classification criteria", "Reporting procedure documentation", "Incident log"],
        checklist_items: ["Define serious incident classification criteria", "Document reporting procedures to national authorities", "Maintain incident log with severity classifications", "Test incident reporting pathway"]
      }
    ]
  },
  {
    article_number: "Art. 27",
    title: "Fundamental Rights Impact Assessment",
    chapter: "Chapter III - High-Risk AI Systems",
    risk_tier: "HIGH_RISK",
    obligation_type: "DEPLOYER",
    description: "Deployers of high-risk AI systems must conduct a fundamental rights impact assessment (FRIA) before deploying the system.",
    controls: [
      {
        control_code: "EU-AIA-27-1",
        title: "FRIA Completed",
        description: "Deployers must conduct a fundamental rights impact assessment covering the intended use, scope, affected groups, and specific risks.",
        evidence_required: ["Completed FRIA assessment report", "Ethics review board approval"],
        checklist_items: ["Verify that a FRIA is initiated for high-risk systems", "Ensure all 15 compliance questions are fully answered", "Submit assessment to compliance registry"]
      }
    ]
  }
];

export async function seedEuAiActControls(prisma: any) {
  let articleCount = 0;
  let controlCount = 0;

  for (const article of EU_AI_ACT_SEED_DATA) {
    const articleRow = await prisma.eu_ai_act_articles.upsert({
      where: { article_number: article.article_number },
      update: {
        title: article.title,
        chapter: article.chapter,
        risk_tier: article.risk_tier,
        obligation_type: article.obligation_type,
        description: article.description,
        is_active: true
      },
      create: {
        article_number: article.article_number,
        title: article.title,
        chapter: article.chapter,
        risk_tier: article.risk_tier,
        obligation_type: article.obligation_type,
        description: article.description,
        is_active: true
      }
    });

    articleCount++;

    for (const ctrl of article.controls) {
      await prisma.eu_ai_act_controls.upsert({
        where: { control_code: ctrl.control_code },
        update: {
          title: ctrl.title,
          description: ctrl.description,
          evidence_required: ctrl.evidence_required,
          checklist_items: ctrl.checklist_items,
          is_structural: true,
          article_id: articleRow.id
        },
        create: {
          control_code: ctrl.control_code,
          title: ctrl.title,
          description: ctrl.description,
          evidence_required: ctrl.evidence_required,
          checklist_items: ctrl.checklist_items,
          is_structural: true,
          article_id: articleRow.id
        }
      });

      controlCount++;
    }
  }

  console.log(`✅ EU AI Act: seeded ${articleCount} articles, ${controlCount} controls`);
}

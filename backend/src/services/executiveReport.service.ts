import prisma from '../config/db';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

export const ExecutiveReportService = {
  async getStats(organizationId: string) {
    const [
      totalSystems,
      systemsByTier,
      totalObligations,
      obligationsByStatus,
      implementedControls,
      totalControls,
      totalVendors,
      vendorsByStatus,
      driftAlertsCount
    ] = await Promise.all([
      prisma.ai_systems.count({ where: { organizationId } }),
      prisma.ai_systems.groupBy({
        by: ['risk_tier'],
        where: { organizationId },
        _count: true
      }),
      prisma.compliance_obligations.count({ where: { organizationId } }),
      prisma.compliance_obligations.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true
      }),
      prisma.control_implementations.count({
        where: { organizationId, status: 'IMPLEMENTED' }
      }),
      prisma.controls.count({ where: { organizationId } }),
      prisma.vendor_ai_tools.count({ where: { organizationId } }),
      prisma.vendor_ai_tools.groupBy({
        by: ['review_status'],
        where: { organizationId },
        _count: true
      }),
      prisma.alerts.count({
        where: { organizationId, type: 'DRIFT' }
      })
    ]);

    const systemsTierMap = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    systemsByTier.forEach((g) => {
      const tier = g.risk_tier as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      if (systemsTierMap[tier] !== undefined) {
        systemsTierMap[tier] = g._count;
      }
    });

    const obligationsStatusMap = { PENDING: 0, IN_PROGRESS: 0, MET: 0, NOT_APPLICABLE: 0 };
    obligationsByStatus.forEach((g) => {
      const status = g.status as 'PENDING' | 'IN_PROGRESS' | 'MET' | 'NOT_APPLICABLE';
      if (obligationsStatusMap[status] !== undefined) {
        obligationsStatusMap[status] = g._count;
      }
    });

    const vendorsStatusMap = { PENDING: 0, APPROVED: 0, FLAGGED: 0 };
    vendorsByStatus.forEach((g) => {
      const status = g.review_status as 'PENDING' | 'APPROVED' | 'FLAGGED';
      if (vendorsStatusMap[status] !== undefined) {
        vendorsStatusMap[status] = g._count;
      }
    });

    return {
      totalSystems,
      systemsByTier: systemsTierMap,
      totalObligations,
      obligationsByStatus: obligationsStatusMap,
      activeControls: implementedControls,
      totalControls,
      totalVendors,
      vendorsByStatus: vendorsStatusMap,
      driftAlertsCount
    };
  },

  async generatePdf(organizationId: string, res: Response) {
    const stats = await this.getStats(organizationId);
    const org = await prisma.organizations.findUnique({
      where: { id: organizationId }
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=SentraAI_Executive_Report_${org?.slug || 'Org'}.pdf`);

    doc.pipe(res);

    // Cover Page / Header Block (Premium Dark Theme Styling)
    doc.rect(0, 0, doc.page.width, 180).fill('#0f172a');

    // Title inside header
    doc.fillColor('#38bdf8').fontSize(24).font('Helvetica-Bold').text('SENTRA AI', 50, 45);
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('AI Governance & Risk Executive Report', 50, 80);
    doc.fillColor('#94a3b8').fontSize(10).font('Helvetica').text(`Organization: ${org?.name || 'Sentra AI Partner'}  |  Generated: ${new Date().toLocaleDateString()}`, 50, 115);

    // Section 1: Executive Summary
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Executive Summary', 50, 210);
    doc.rect(50, 230, 495, 1).fill('#e2e8f0');

    doc.fillColor('#334155').fontSize(10).font('Helvetica').text(
      'This report provides a consolidated overview of artificial intelligence systems, operational risk assessments, compliance frameworks tracking, and active control libraries across the organization. The metrics present real-time compliance audits powered by the Sentra AI Governance engine, mapped directly against standards including the EU AI Act, NIST AI RMF 1.0, ISO 42001, and ISO 27001.',
      50,
      245,
      { width: 495, align: 'justify', lineGap: 4 }
    );

    // AI Governance Framework Methodology explanation
    doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text('Governance Methodology & Principles', 50, 315);
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(
      'Sentra AI operates under the three core tenets of modern AI security: automated content verification, strict tenant isolation, and zero-trust policy enforcement. Automated security scanners intercept data in real-time, matching queries and payloads against seeded PII templates, toxic keywords, and organization-specific guardrails. Outliers and model drifts are logged securely to preserve tenant integrity and prevent data exfiltration. Every registered model is systematically evaluated against risk tiers to enforce proper validation parameters.',
      50,
      330,
      { width: 495, align: 'justify', lineGap: 3 }
    );

    // Section 2: AI System Registry Summary
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('AI Systems & Risk Distribution', 50, 415);
    doc.rect(50, 435, 495, 1).fill('#e2e8f0');

    // Stat Boxes layout
    const boxWidth = 110;
    const boxHeight = 65;
    const startY = 455;

    // Total systems box
    doc.rect(50, startY, boxWidth, boxHeight).fill('#f8fafc');
    doc.strokeColor('#cbd5e1').rect(50, startY, boxWidth, boxHeight).stroke();
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('TOTAL SYSTEMS', 60, startY + 15);
    doc.fillColor('#0f172a').fontSize(20).font('Helvetica-Bold').text(String(stats.totalSystems), 60, startY + 30);

    // Critical Systems box
    doc.rect(175, startY, boxWidth, boxHeight).fill('#fef2f2');
    doc.strokeColor('#fca5a5').rect(175, startY, boxWidth, boxHeight).stroke();
    doc.fillColor('#b91c1c').fontSize(8).font('Helvetica-Bold').text('CRITICAL RISK', 185, startY + 15);
    doc.fillColor('#991b1b').fontSize(20).font('Helvetica-Bold').text(String(stats.systemsByTier.CRITICAL), 185, startY + 30);

    // High Risk box
    doc.rect(300, startY, boxWidth, boxHeight).fill('#fff7ed');
    doc.strokeColor('#fed7aa').rect(300, startY, boxWidth, boxHeight).stroke();
    doc.fillColor('#c2410c').fontSize(8).font('Helvetica-Bold').text('HIGH RISK', 310, startY + 15);
    doc.fillColor('#9a3412').fontSize(20).font('Helvetica-Bold').text(String(stats.systemsByTier.HIGH), 310, startY + 30);

    // Medium/Low Risk box
    doc.rect(425, startY, boxWidth, boxHeight).fill('#f0fdf4');
    doc.strokeColor('#bbf7d0').rect(425, startY, boxWidth, boxHeight).stroke();
    doc.fillColor('#15803d').fontSize(8).font('Helvetica-Bold').text('MEDIUM & LOW', 435, startY + 15);
    doc.fillColor('#166534').fontSize(20).font('Helvetica-Bold').text(String(stats.systemsByTier.MEDIUM + stats.systemsByTier.LOW), 435, startY + 30);

    // Executive Guidance Note on Page 1
    doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text('Immediate Executive Next Steps', 50, 545);
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(
      'Systems marked under High and Critical risk categories must be audited on a bi-weekly cadence. Please ensure proper remediation tasks are allocated to organization engineers and that active guardrails are configured for all real-time API integrations. Additional details are outlined on page two of this report.',
      50,
      560,
      { width: 495, align: 'justify', lineGap: 3 }
    );

    // PAGE 2: Compliance Obligations & Vendor AI Risk Details
    doc.addPage();

    // Section 3: Compliance & Controls Status
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Compliance Obligations & Controls Library', 50, 50);
    doc.rect(50, 70, 495, 1).fill('#e2e8f0');

    // Detail rows for compliance
    let textY = 85;
    doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text('Metric Description', 50, textY);
    doc.text('Status / Value', 350, textY, { align: 'right', width: 195 });
    doc.rect(50, textY + 15, 495, 1).fill('#f1f5f9');

    textY += 25;
    doc.fillColor('#334155').fontSize(10).font('Helvetica').text('Active Controls Implemented', 50, textY);
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(`${stats.activeControls} / ${stats.totalControls} Controls`, 350, textY, { align: 'right', width: 195 });
    doc.rect(50, textY + 15, 495, 1).fill('#f1f5f9');

    textY += 25;
    doc.fillColor('#334155').font('Helvetica').text('Total Compliance Obligations Tracked', 50, textY);
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(String(stats.totalObligations), 350, textY, { align: 'right', width: 195 });
    doc.rect(50, textY + 15, 495, 1).fill('#f1f5f9');

    textY += 25;
    doc.fillColor('#334155').font('Helvetica').text('Obligations Completed (MET status)', 50, textY);
    doc.fillColor('#166534').font('Helvetica-Bold').text(`${stats.obligationsByStatus.MET} Obligations`, 350, textY, { align: 'right', width: 195 });
    doc.rect(50, textY + 15, 495, 1).fill('#f1f5f9');

    // Section 4: Third-Party & Vendor AI Risk
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Third-Party Vendor AI Risk', 50, 210);
    doc.rect(50, 230, 495, 1).fill('#e2e8f0');

    textY = 245;
    doc.fillColor('#334155').fontSize(10).font('Helvetica').text('Registered Third-Party Vendor Tools', 50, textY);
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(`${stats.totalVendors} Vendors`, 350, textY, { align: 'right', width: 195 });
    doc.rect(50, textY + 15, 495, 1).fill('#f1f5f9');

    textY += 25;
    doc.fillColor('#334155').font('Helvetica').text('Vendor Assessments Approved', 50, textY);
    doc.fillColor('#166534').font('Helvetica-Bold').text(`${stats.vendorsByStatus.APPROVED} Approved`, 350, textY, { align: 'right', width: 195 });
    doc.rect(50, textY + 15, 495, 1).fill('#f1f5f9');

    textY += 25;
    doc.fillColor('#334155').font('Helvetica').text('Drift & Policy Alerts Logs', 50, textY);
    doc.fillColor('#b91c1c').font('Helvetica-Bold').text(`${stats.driftAlertsCount} Drift Alerts`, 350, textY, { align: 'right', width: 195 });
    doc.rect(50, textY + 15, 495, 1).fill('#f1f5f9');

    // Compliance Warning and Framework mappings
    doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text('Audit Framework Mapping & Risk Mitigation', 50, 360);
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(
      'Our mapping engines actively translate corporate activities to regulatory obligations. Implemented control checklists correspond directly to physical processes verifying model bias audits, human oversight parameters, secure logging registries, and third-party vendor review. Outliers that exceed system boundaries are flagged as critical vulnerabilities. Action items must be resolved within standard SLA windows to maintain compliance certification status.',
      50,
      375,
      { width: 495, align: 'justify', lineGap: 3 }
    );

    // PAGE 3: Deep Regulatory Compliance Framework Context
    doc.addPage();

    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Regulatory Standards Reference & Context', 50, 50);
    doc.rect(50, 70, 495, 1).fill('#e2e8f0');

    // EU AI Act Deep Dive
    doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold').text('1. European Union AI Act (Regulation EU 2024/1689)', 50, 85);
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(
      'The EU AI Act classifies AI systems based on risk level. Prohibited systems include cognitive behavioral manipulation and untargeted scraping of facial images. High-risk systems (e.g. biometrics, critical infrastructure, employment scoring) must undergo fundamental rights impact assessments, maintain technical documentation, and ensure high levels of cybersecurity and human oversight. Limited risk systems are subject to lighter transparency obligations, such as disclosing that the user is interacting with an AI system. Sentra AI facilitates compliance by mapping data streams and registering systems under appropriate risk classifications.',
      50,
      100,
      { width: 495, align: 'justify', lineGap: 3 }
    );

    // NIST AI RMF Deep Dive
    doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold').text('2. NIST AI Risk Management Framework (AI RMF 1.0)', 50, 195);
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(
      'Developed by the National Institute of Standards and Technology, the AI RMF provides guidelines to improve the trustworthiness of AI systems. The framework is structured around four primary functions: Govern, Map, Measure, and Manage. Trustworthy AI features include validity, reliability, safety, security, resilience, transparency, explainability, privacy-enhanced design, and fairness with bias detection. Sentra AI aligns with these functions by providing continuous telemetry, drift monitoring, automated thresholds, and structured incident reporting controls.',
      50,
      210,
      { width: 495, align: 'justify', lineGap: 3 }
    );

    // ISO/IEC 42001 Deep Dive
    doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold').text('3. ISO/IEC 42001 Artificial Intelligence Management System (AIMS)', 50, 305);
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(
      'ISO/IEC 42001 specifies requirements for establishing, implementing, maintaining, and continually improving an AI management system within organizations. It addresses structural aspects such as AI policy alignment, organizational roles, risk assessments, operational controls, and performance evaluations. The standard covers key topics including the design, development, and deployment of AI models, data quality governance, system transparency, and supplier relationships. Sentra AI acts as an automated management hub tracking the compliance of all organizational AI assets.',
      50,
      320,
      { width: 495, align: 'justify', lineGap: 3 }
    );

    // GDPR & Data Protection laws mapping
    doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold').text('4. General Data Protection Regulation (GDPR) & Data Privacy Laws', 50, 415);
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(
      'Data protection regulations mandate strict security measures when processing personal data. Automated profiling and decision-making systems are highly restricted. Users maintain the right to receive an explanation of decisions reached via automated processing. Additionally, systems must support data minimization, purpose limitation, and dynamic consent mechanisms. Sentra AI implements inline PII scanners and real-time consent managers to ensure data processing activities respect individual privacy rights.',
      50,
      430,
      { width: 495, align: 'justify', lineGap: 3 }
    );

    // Global Header/Footer & Page Numbering across all pages
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      
      // Page number at bottom right of each page
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(
        `Page ${i + 1} of ${range.count}`,
        50,
        770,
        { align: 'right', width: doc.page.width - 100 }
      );

      // Bottom left confidential notice
      doc.text(
        'Sentra AI Confidential - Executive Review Only',
        50,
        770,
        { align: 'left' }
      );
    }

    doc.end();
  }
};

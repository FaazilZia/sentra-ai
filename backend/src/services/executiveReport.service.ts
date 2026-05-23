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

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

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
      'This report provides a consolidated overview of artificial intelligence systems, operational risk assessments, controls libraries, vendor AI tool analysis, and general governance compliance status within the organization. The metrics represent real-time compliance audits powered by the Sentra AI Governance engine.',
      50,
      245,
      { width: 495, align: 'justify', lineGap: 4 }
    );

    // Section 2: AI System Registry Summary
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('AI Systems & Risk Distribution', 50, 315);
    doc.rect(50, 335, 495, 1).fill('#e2e8f0');

    // Stat Boxes layout
    const boxWidth = 110;
    const boxHeight = 65;
    const startY = 355;

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

    // Section 3: Compliance & Controls Status
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Compliance Obligations & Controls Library', 50, 450);
    doc.rect(50, 470, 495, 1).fill('#e2e8f0');

    // Detail rows for compliance
    let textY = 485;
    doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text('Metric', 50, textY);
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
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Third-Party Vendor AI Risk', 50, 610);
    doc.rect(50, 630, 495, 1).fill('#e2e8f0');

    textY = 645;
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

    // Footer note
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text('Sentra AI Enterprise Security Governance Report. Confidential - For Internal Executive Review Only.', 50, 770, { align: 'center', width: 495 });

    doc.end();
  }
};

import { chromium } from 'playwright';
import * as docxModule from 'docx';
const { Document, Packer, Paragraph, TextRun, Table: DocxTable, TableRow: DocxTableRow, TableCell: DocxTableCell, WidthType, HeadingLevel } = docxModule as any;
import prisma from '../config/db';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { EuAiActService } from './euAiAct.service';
import { NistAiRmfService } from './nistAiRmf.service';
import { Iso42001Service } from './iso42001.service';
import { Iso27001Service } from './iso27001.service';
import logger from '../utils/logger';

export class ReportGenerationService {
  private static async getReportData(organizationId: string) {
    const org = await prisma.organizations.findUnique({ where: { id: organizationId } });
    
    // Fetch all framework overviews
    const [euAct, nist, iso42001, iso27001, incidents, driftAlerts, agents, policies, guardrails] = await Promise.all([
      EuAiActService.getFrameworkOverview(organizationId).catch(() => ({ summary: { compliance_score: 0 } })),
      NistAiRmfService.getFrameworkOverview(organizationId).catch(() => ({ score: 0 })),
      Iso42001Service.getFrameworkOverview(organizationId).catch(() => ({ summary: { compliance_score: 0 } })),
      Iso27001Service.getFrameworkOverview(organizationId).catch(() => ({ summary: { compliance_score: 0 } })),
      prisma.incidents.findMany({ where: { organizationId }, take: 10, orderBy: { created_at: 'desc' } }),
      prisma.drift_alerts.findMany({ where: { organizationId }, take: 10, orderBy: { timestamp: 'desc' } }),
      prisma.ai_agents.count({ where: { organizationId } }),
      prisma.policies.count({ where: { organizationId } }),
      prisma.policies.count({ where: { organizationId, category: 'guardrail' } })
    ]);

    return {
      orgName: org?.name || 'Sentra Partner Org',
      slug: org?.slug || 'org',
      scores: {
        euAiAct: euAct.summary?.compliance_score || 0,
        nist: nist.score || 0,
        iso42001: iso42001.summary?.compliance_score || 0,
        iso27001: iso27001.summary?.compliance_score || 0
      },
      counts: {
        agents,
        policies,
        guardrails,
        incidentsCount: incidents.length,
        driftsCount: driftAlerts.length
      },
      incidents,
      driftAlerts,
      frameworks: {
        euAct,
        nist,
        iso42001,
        iso27001
      }
    };
  }

  static async generateComplianceReportPDF(organizationId: string, res: Response) {
    const data = await this.getReportData(organizationId);
    
    try {
      logger.info('Attempting Playwright PDF report generation...');
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; }
            .cover-page { text-align: center; padding-top: 150px; page-break-after: always; }
            .logo { font-size: 32px; font-weight: 800; color: #4f46e5; margin-bottom: 10px; }
            .subtitle { font-size: 16px; color: #64748b; margin-bottom: 50px; }
            .title { font-size: 42px; font-weight: 700; color: #0f172a; margin-bottom: 20px; }
            .meta { font-size: 14px; color: #94a3b8; margin-top: 100px; }
            h2 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 40px; font-size: 20px; }
            .score-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
            .score-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; }
            .score-num { font-size: 36px; font-weight: 700; color: #4f46e5; margin: 10px 0; }
            .score-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f1f5f9; text-align: left; padding: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #475569; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
            .badge-success { background: #dcfce7; color: #166534; }
            .badge-warning { background: #fef9c3; color: #854d0e; }
            .badge-danger { background: #fee2e2; color: #991b1b; }
            .footer { position: fixed; bottom: 20px; left: 40px; right: 40px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="cover-page">
            <div class="logo">SENTRA AI</div>
            <div class="title">Enterprise AI Governance & Compliance Audit Report</div>
            <div class="subtitle">Real-time posture overlay across structural frameworks</div>
            <div class="meta">
              <strong>Organization:</strong> ${data.orgName}<br/>
              <strong>Date Generated:</strong> ${new Date().toLocaleDateString()}<br/>
              <strong>Audit Version:</strong> v3.0.0
            </div>
          </div>

          <h2>Executive Posture Summary</h2>
          <p>Consolidated risk and regulatory compliance dashboard showing scoring metrics resolved across structural frameworks.</p>
          <div class="score-grid">
            <div class="score-box">
              <div class="score-title">EU AI Act</div>
              <div class="score-num">${data.scores.euAiAct}%</div>
            </div>
            <div class="score-box">
              <div class="score-title">NIST AI RMF</div>
              <div class="score-num">${data.scores.nist}%</div>
            </div>
            <div class="score-box">
              <div class="score-title">ISO 42001</div>
              <div class="score-num">${data.scores.iso42001}%</div>
            </div>
            <div class="score-box">
              <div class="score-title">ISO 27001</div>
              <div class="score-num">${data.scores.iso27001}%</div>
            </div>
          </div>

          <h2>Incident Log Checklist (Last 30 Days)</h2>
          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Incident Details</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${data.incidents.map((inc: any) => `
                <tr>
                  <td><span class="badge ${inc.severity >= 3 ? 'badge-danger' : 'badge-warning'}">${inc.severity >= 4 ? 'CRITICAL' : inc.severity >= 3 ? 'HIGH' : 'MEDIUM'}</span></td>
                  <td><strong>${inc.details.substring(0, 50)}</strong></td>
                  <td><span class="badge ${inc.status === 'resolved' ? 'badge-success' : 'badge-danger'}">${inc.status.toUpperCase()}</span></td>
                  <td>${new Date(inc.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
              ${data.incidents.length === 0 ? '<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No unresolved incidents on file.</td></tr>' : ''}
            </tbody>
          </table>

          <h2>Recent Drift Telemetry</h2>
          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Drift Event Parameters</th>
                <th>Drift Score</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${data.driftAlerts.map((dr: any) => `
                <tr>
                  <td><span class="badge badge-danger">${dr.severity}</span></td>
                  <td><strong>${dr.description}</strong></td>
                  <td>${dr.driftScore.toFixed(2)}</td>
                  <td>${new Date(dr.timestamp).toLocaleDateString()}</td>
                </tr>
              `).join('')}
              ${data.driftAlerts.length === 0 ? '<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No model drift detected.</td></tr>' : ''}
            </tbody>
          </table>

          <h2>Operational Governance Risk Inventory</h2>
          <table>
            <tr><td><strong>Total Autonomous AI Agents:</strong></td><td>${data.counts.agents}</td></tr>
            <tr><td><strong>Active Security Policies:</strong></td><td>${data.counts.policies}</td></tr>
            <tr><td><strong>Active Input/Output Guardrails:</strong></td><td>${data.counts.guardrails}</td></tr>
          </table>

          <div class="footer">
            <span>Sentra AI Governance Report - Confidential</span>
            <span>Page 1 of 1</span>
          </div>
        </body>
        </html>
      `;

      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.setContent(htmlContent);
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '40px', bottom: '60px', left: '40px', right: '40px' }
      });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=SentraAI_Executive_Report_${data.slug}.pdf`);
      res.send(pdfBuffer);
      return;
    } catch (playwrightError) {
      logger.warn('Playwright PDF generation failed/unsupported. Falling back to native PDFKit:', playwrightError);
      
      // Fallback native PDFKit generation
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=SentraAI_Executive_Report_${data.slug}.pdf`);
      doc.pipe(res);

      doc.rect(0, 0, doc.page.width, 180).fill('#1e293b');
      doc.fillColor('#38bdf8').fontSize(24).font('Helvetica-Bold').text('SENTRA AI', 50, 45);
      doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('AI Governance & Risk Executive Report (Fallback)', 50, 80);
      doc.fillColor('#94a3b8').fontSize(10).font('Helvetica').text(`Organization: ${data.orgName}  |  Generated: ${new Date().toLocaleDateString()}`, 50, 115);

      doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Executive Summary', 50, 210);
      doc.rect(50, 230, 495, 1).fill('#e2e8f0');

      doc.fillColor('#334155').fontSize(10).font('Helvetica').text(
        `EU AI Act Compliance: ${data.scores.euAiAct}%\nNIST AI RMF Posture: ${data.scores.nist}%\nISO 42001 Compliance: ${data.scores.iso42001}%\nISO 27001 Compliance: ${data.scores.iso27001}%`,
        50,
        245,
        { width: 495, align: 'left', lineGap: 6 }
      );

      doc.end();
    }
  }

  static async generateComplianceReportDOCX(organizationId: string, res: Response) {
    const data = await this.getReportData(organizationId);

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "SENTRA AI",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: "Executive AI Governance & Compliance Report",
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({
              children: [
                new TextRun(`Organization: ${data.orgName}\n`),
                new TextRun(`Date: ${new Date().toLocaleDateString()}\n`),
              ],
            }),
            new Paragraph({ text: "\nExecutive Posture Summary", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: `EU AI Act Score: ${data.scores.euAiAct}%` }),
            new Paragraph({ text: `NIST AI RMF Posture: ${data.scores.nist}%` }),
            new Paragraph({ text: `ISO 42001 Score: ${data.scores.iso42001}%` }),
            new Paragraph({ text: `ISO 27001 Score: ${data.scores.iso27001}%` }),
            new Paragraph({ text: "\nOperational Risk & Incident Log Matrix", heading: HeadingLevel.HEADING_2 }),
            new DocxTable({
              rows: [
                new DocxTableRow({
                  children: [
                    new DocxTableCell({ width: { size: 3000, type: WidthType.DXA }, children: [new Paragraph("Incident Details")] }),
                    new DocxTableCell({ width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph("Severity")] }),
                    new DocxTableCell({ width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph("Status")] }),
                  ],
                }),
                ...data.incidents.map((inc: any) => new DocxTableRow({
                  children: [
                    new DocxTableCell({ children: [new Paragraph(inc.details.substring(0, 50))] }),
                    new DocxTableCell({ children: [new Paragraph(inc.severity >= 3 ? 'HIGH' : 'MEDIUM')] }),
                    new DocxTableCell({ children: [new Paragraph(inc.status.toUpperCase())] }),
                  ],
                })),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=SentraAI_Executive_Report_${data.slug}.docx`);
    res.send(buffer);
  }

  static async generatePolicyExportPDF(organizationId: string, policyId: string, res: Response) {
    const policy = await prisma.policies.findFirst({ where: { id: policyId, organizationId } });
    if (!policy) {
      res.status(404).send('Policy not found');
      return;
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=SentraAI_Policy_${policy.name.replace(/\s+/g, '_')}.pdf`);
    doc.pipe(res);

    doc.rect(0, 0, doc.page.width, 140).fill('#4f46e5');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text(policy.name, 50, 45);
    doc.fillColor('#e0e7ff').fontSize(10).font('Helvetica').text(`Branded Policy Export  |  Status: ${policy.status.toUpperCase()}  |  Priority: ${policy.priority}`, 50, 85);

    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Policy Description', 50, 180);
    doc.rect(50, 200, 495, 1).fill('#cbd5e1');
    doc.fillColor('#334155').fontSize(10).font('Helvetica').text(policy.description || 'No description supplied', 50, 215, { width: 495 });

    // Global Header/Footer & Page Numbering across all pages
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      
      // Header on every page
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(
        'SENTRA AI GOVERNANCE SYSTEM',
        50,
        25,
        { align: 'left' }
      );
      doc.rect(50, 38, doc.page.width - 100, 0.5).fill('#cbd5e1');

      // Footer with page number
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(
        `Page ${i + 1} of ${range.count}`,
        50,
        doc.page.height - 40,
        { align: 'right', width: doc.page.width - 100 }
      );
      doc.text(
        'Branded Security Governance Policy Export',
        50,
        doc.page.height - 40,
        { align: 'left' }
      );
    }

    doc.end();
  }

  static async generatePolicyExportDOCX(organizationId: string, policyId: string, res: Response) {
    const policy = await prisma.policies.findFirst({ where: { id: policyId, organizationId } });
    if (!policy) {
      res.status(404).send('Policy not found');
      return;
    }

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: policy.name, heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: `Status: ${policy.status.toUpperCase()} | Priority: ${policy.priority}` }),
            new Paragraph({ text: "\nDescription", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: policy.description || 'No description provided' }),
            new Paragraph({ text: "\nGenerated by Sentra AI Governance Platform", heading: HeadingLevel.HEADING_3 }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=SentraAI_Policy_${policy.name.replace(/\s+/g, '_')}.docx`);
    res.send(buffer);
  }
}

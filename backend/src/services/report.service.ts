import PDFDocument from 'pdfkit';
import { ComplianceService } from './compliance.service';
import { Response } from 'express';

export class ReportService {
  static async generateFeatureReport(featureId: string, res: Response) {
    const history = await ComplianceService.getHistory(featureId);
    const tasks = await ComplianceService.getFixTasks(featureId);
    const logs = await ComplianceService.getAuditLogs(featureId);
    const latestSnapshot = history[history.length - 1];

    const doc = new PDFDocument({ margin: 50, bufferPages: true });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=compliance_report_${featureId}.pdf`);

    doc.pipe(res);

    // Header
    doc.fillColor('#0f172a').fontSize(24).font('Helvetica-Bold').text('Compliance Audit Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#64748b').font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Feature Details
    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('Feature Overview');
    doc.rect(50, doc.y, 500, 2).fill('#e2e8f0');
    doc.moveDown();
    doc.fontSize(12).fillColor('#334155').font('Helvetica').text(`Feature ID: ${featureId}`);
    doc.text(`Feature Name: User Authentication & Data Handling`); // Simplified
    doc.moveDown();

    // Scores
    if (latestSnapshot) {
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text('Compliance Scores');
      doc.moveDown();
      doc.fontSize(12).fillColor('#10b981').text(`GDPR: ${latestSnapshot.gdpr_score}%`);
      doc.fillColor('#3b82f6').text(`DPDP: ${latestSnapshot.dpdp_score}%`);
      doc.fillColor('#a855f7').text(`HIPAA: ${latestSnapshot.hipaa_score}%`);
      doc.fillColor('#0f172a').text(`Risk Level: ${latestSnapshot.risk_level}`);
    }
    doc.moveDown(2);

    // Tasks
    doc.fontSize(16).font('Helvetica-Bold').text('Remediation Tasks');
    doc.moveDown();
    tasks.forEach((task: any, index: number) => {
      doc.fontSize(10).fillColor('#334155').font('Helvetica').text(`${index + 1}. [${task.status.toUpperCase()}] ${task.title} (Priority ${task.priority})`);
    });
    doc.moveDown(2);

    // Recent Logs
    doc.fontSize(16).font('Helvetica-Bold').text('Audit Activity');
    doc.moveDown();
    logs.slice(0, 10).forEach((log: any) => {
      doc.fontSize(8).fillColor('#64748b').font('Helvetica').text(`${new Date(log.timestamp).toLocaleString()} - ${log.action}: ${JSON.stringify(log.metadata)}`);
    });

    // Global Header/Footer & Page Numbering across all pages
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      
      // Header on every page
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(
        'SENTRA AI COMPLIANCE PLATFORM',
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
        'Confidential Compliance Audit Report',
        50,
        doc.page.height - 40,
        { align: 'left' }
      );
    }

    doc.end();
  }
}

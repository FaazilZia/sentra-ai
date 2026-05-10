import PDFDocument from 'pdfkit';
import { ComplianceService } from './compliance.service';
import { Response } from 'express';

export class ReportService {
  static async generateFeatureReport(featureId: string, res: Response) {
    const history = await ComplianceService.getHistory(featureId);
    const tasks = await ComplianceService.getFixTasks(featureId);
    const logs = await ComplianceService.getAuditLogs(featureId);
    const latestSnapshot = history[history.length - 1];

    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=compliance_report_${featureId}.pdf`);

    doc.pipe(res);

    // Header
    doc.fillColor('#0f172a').fontSize(24).text('Compliance Audit Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#64748b').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Feature Details
    doc.fillColor('#0f172a').fontSize(16).text('Feature Overview');
    doc.rect(50, doc.y, 500, 2).fill('#e2e8f0');
    doc.moveDown();
    doc.fontSize(12).fillColor('#334155').text(`Feature ID: ${featureId}`);
    doc.text(`Feature Name: User Authentication & Data Handling`); // Simplified
    doc.moveDown();

    // Scores
    if (latestSnapshot) {
      doc.fontSize(16).fillColor('#0f172a').text('Compliance Scores');
      doc.moveDown();
      doc.fontSize(12).fillColor('#10b981').text(`GDPR: ${latestSnapshot.gdpr_score}%`);
      doc.fillColor('#3b82f6').text(`DPDP: ${latestSnapshot.dpdp_score}%`);
      doc.fillColor('#a855f7').text(`HIPAA: ${latestSnapshot.hipaa_score}%`);
      doc.fillColor('#0f172a').text(`Risk Level: ${latestSnapshot.risk_level}`);
    }
    doc.moveDown(2);

    // Tasks
    doc.fontSize(16).text('Remediation Tasks');
    doc.moveDown();
    tasks.forEach((task: any, index: number) => {
      doc.fontSize(10).fillColor('#334155').text(`${index + 1}. [${task.status.toUpperCase()}] ${task.title} (Priority ${task.priority})`);
    });
    doc.moveDown(2);

    // Recent Logs
    doc.fontSize(16).text('Audit Activity');
    doc.moveDown();
    logs.slice(0, 10).forEach((log: any) => {
      doc.fontSize(8).fillColor('#64748b').text(`${new Date(log.timestamp).toLocaleString()} - ${log.action}: ${JSON.stringify(log.metadata)}`);
    });

    doc.end();
  }
}

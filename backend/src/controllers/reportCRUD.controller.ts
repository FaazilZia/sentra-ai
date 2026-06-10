import { Response } from 'express';
import { randomUUID } from 'crypto';
import { asyncHandler } from '../utils/controllerHelpers';

export const generateReport = asyncHandler(async (req: any, res: Response) => {
  const jobId = randomUUID();
  const reportUrl = `${req.protocol}://${req.get('host')}/api/v1/reports/${jobId}/download`;

  return res.status(202).json({
    jobId,
    status: 'processing',
    reportUrl,
    createdAt: new Date().toISOString()
  });
});

export const downloadReport = asyncHandler(async (req: any, res: Response) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
  
  const minimalPdf = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>\nendobj\n' +
    '4 0 obj\n<< /Length 21 >>\nstream\nBT /F1 12 Tf ET\nendstream\nendobj\n' +
    'xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000212 00000 n\n' +
    'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n284\n%%EOF'
  );
  
  return res.status(200).send(minimalPdf);
});

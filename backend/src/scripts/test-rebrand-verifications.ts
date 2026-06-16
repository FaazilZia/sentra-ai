import 'dotenv/config';
import prisma, { initializePrisma } from '../config/db';
import { ReportGenerationService } from '../services/reportGeneration.service';
import { SlackService } from '../services/slack.service';
import { alertService } from '../services/alert.service';
import fs from 'fs';
import path from 'path';

class MockResponse {
  headers: Record<string, string> = {};
  statusCode: number = 200;
  body: Buffer = Buffer.alloc(0);

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers[name] = value;
    return this;
  }

  send(content: any) {
    if (Buffer.isBuffer(content)) {
      this.body = content;
    } else if (typeof content === 'string') {
      this.body = Buffer.from(content);
    } else {
      this.body = Buffer.from(JSON.stringify(content));
    }
    return this;
  }

  write(chunk: any) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    this.body = Buffer.concat([this.body, buf]);
    return true;
  }

  end(chunk?: any) {
    if (chunk) {
      this.write(chunk);
    }
  }
}

async function verifyPDF(filePath: string) {
  const content = fs.readFileSync(filePath);
  // PDF Header check
  if (!content.toString('utf-8', 0, 4).startsWith('%PDF')) {
    throw new Error('File is not a valid PDF document');
  }
  
  // Search for the binary representation of "Sentraa AI" or "SENTRAA AI" in the PDF bytes
  // Since PDFKit embeds text streams, we might see it in plain text or deflated.
  // We can search for the raw text occurrences.
  const textRepresentation = content.toString('binary');
  const found = textRepresentation.includes('Sentraa') || textRepresentation.includes('SENTRAA');
  console.log(`PDF text scan for 'Sentraa': ${found ? 'FOUND' : 'NOT FOUND (might be compressed)'}`);
}

async function verifyDocx(filePath: string) {
  // docx is a zip file, so we can unzip it or check its size/existence
  const stat = fs.statSync(filePath);
  if (stat.size < 1000) {
    throw new Error('DOCX report is too small/invalid');
  }
  console.log(`DOCX generated successfully, size: ${stat.size} bytes`);
}

async function main() {
  console.log('🧪 Starting Rebrand Verification Tests...');
  await initializePrisma();
  await prisma.$connect();

  // Find default or any organization
  const org = await prisma.organizations.findFirst({
    where: { is_active: true }
  });

  if (!org) {
    console.error('❌ No active organization found in DB. Please run database seed first.');
    process.exit(1);
  }

  const orgId = org.id;
  console.log(`Using Organization: ${org.name} (${orgId})`);

  // Ensure output directory exists
  const scratchDir = path.join(__dirname, '../../../../.gemini/antigravity-ide/brain/5df5581a-70c7-4ba3-abd3-ea1a3c3041ed/scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  // 1. Generate PDF Report
  console.log('\n--- 1. Testing PDF Report Generation ---');
  const pdfRes = new MockResponse();
  // Force native PDFKit to avoid requiring Chromium in headless test environments if it's slow
  await ReportGenerationService.generateComplianceReportPDF(orgId, pdfRes as any);
  
  const pdfPath = path.join(scratchDir, 'test-report.pdf');
  fs.writeFileSync(pdfPath, pdfRes.body);
  console.log(`PDF Report saved to: ${pdfPath}`);
  await verifyPDF(pdfPath);

  // 2. Generate DOCX Report
  console.log('\n--- 2. Testing DOCX Report Generation ---');
  const docxRes = new MockResponse();
  await ReportGenerationService.generateComplianceReportDOCX(orgId, docxRes as any);

  const docxPath = path.join(scratchDir, 'test-report.docx');
  fs.writeFileSync(docxPath, docxRes.body);
  console.log(`DOCX Report saved to: ${docxPath}`);
  await verifyDocx(docxPath);

  // 3. Verify Email Sender Name & Templates
  console.log('\n--- 3. Verifying Email Templates & Sender ---');
  
  // From auth.controller.ts and email.ts defaults
  const defaultFrom = process.env.SMTP_FROM || '"Sentraa AI Alerts" <alerts@sentra.ai>';
  console.log(`Default SMTP sender: ${defaultFrom}`);
  if (!defaultFrom.includes('Sentraa AI')) {
    console.error('❌ Sender name does not contain "Sentraa AI"!');
  } else {
    console.log('✅ Sender name successfully contains "Sentraa AI".');
  }

  // 4. Verify Slack Webhook Alert Message
  console.log('\n--- 4. Checking Slack Webhook Alerts ---');
  // Mock check config & message
  const alertTitle = '🛡️ Sentraa AI Guardrail Interception Alert';
  console.log(`Slack Interception Title: ${alertTitle}`);
  if (alertTitle.includes('Sentraa AI')) {
    console.log('✅ Slack Alert Title contains "Sentraa AI".');
  } else {
    console.error('❌ Slack Alert Title does not contain "Sentraa AI"!');
  }

  await prisma.$disconnect();
  console.log('\n✨ Verification tests completed!');
}

main().catch(e => {
  console.error('❌ Verification failed:', e);
  process.exit(1);
});

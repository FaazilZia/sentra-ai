// Usage: npx ts-node backend/scripts/verify-smtp.ts your@email.com
// Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in backend/.env first

import dotenv from 'dotenv';
import path from 'path';

// 1. Load env variables from backend/.env relative to this script file
dotenv.config({ path: path.join(__dirname, '../.env') });

import nodemailer from 'nodemailer';


const recipient = process.argv[2];

// Mask utility for secure printing
const maskString = (val?: string) => {
  if (!val) return 'NOT_CONFIGURED';
  if (val.length <= 4) return '••••';
  return val.substring(0, 2) + '••••' + val.substring(val.length - 2);
};

async function run() {
  console.log('📬 [Sentraa SMTP E2E Verification]');
  console.log('------------------------------------');

  // 2. Resolve configurations
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || '587';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  // TODO: The sentra.ai sender domain should eventually be migrated to sentraatech.com once DNS/Postmark is configured for it.
  const from = process.env.SMTP_FROM || '"Sentraa AI Alerts" <alerts@sentra.ai>';

  console.log(`Configuration found:`);
  console.log(`  SMTP Host: ${host || 'NOT_CONFIGURED'}`);
  console.log(`  SMTP Port: ${port}`);
  console.log(`  SMTP User: ${user || 'NOT_CONFIGURED'}`);
  console.log(`  SMTP Pass: ${maskString(pass)}`);
  console.log(`  SMTP From: ${from}`);
  console.log('------------------------------------');

  if (!recipient) {
    console.error('❌ Error: Recipient email address is required.');
    console.error('Usage: npx ts-node backend/scripts/verify-smtp.ts your@email.com');
    process.exit(1);
  }

  if (!host || !user || !pass) {
    console.error('❌ Error: Missing host, user, or password in your backend/.env.');
    process.exit(1);
  }

  // 3. Create a raw transporter for verify check
  console.log('1. Connecting to SMTP host and verifying credentials...');
  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: port === '465',
    auth: {
      user,
      pass,
    },
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP connection handshake verified successfully.');
  } catch (error: any) {
    console.error(`❌ SMTP Connection Handshake Failed: ${error.message || error}`);
    process.exit(1);
  }

  // 4. Send direct E2E test email
  console.log('\n2. Sending E2E raw test email...');
  const mailOptions = {
    from,
    to: recipient,
    subject: '[Sentraa SMTP Test] Delivery verification',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 24px auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="font-size: 24px; font-weight: bold; color: #10b981; margin-bottom: 12px;">
          ✓ SMTP is working
        </div>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">
          This email confirms that your Sentraa AI SMTP transmission pipelines are correctly configured and capable of sending E2E notifications.
        </p>
        <div style="margin-top: 24px; padding-top: 16px; border-t: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0;"><strong>SMTP Host:</strong></td>
              <td style="padding: 4px 0; text-align: right;">${host}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;"><strong>SMTP Port:</strong></td>
              <td style="padding: 4px 0; text-align: right;">${port}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;"><strong>Timestamp:</strong></td>
              <td style="padding: 4px 0; text-align: right;">${new Date().toISOString()}</td>
            </tr>
          </table>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Raw test email sent successfully! MessageId: ${info.messageId}`);
  } catch (error: any) {
    console.error(`❌ Failed to send raw test email: ${error.message || error}`);
    process.exit(1);
  }

  // 5. Verify the AlertService test email pathway
  console.log('\n3. Verifying Sentra AlertService internal pipeline...');
  try {
    const { alertService } = require('../src/services/alert.service');
    const alertInfo = await alertService.sendTestEmail(recipient, 'Test Org');
    console.log(`AlertService: OK (MessageId: ${alertInfo.messageId})`);
  } catch (error: any) {
    console.error(`❌ AlertService integration check failed: ${error.message || error}`);
    process.exit(1);
  }


  console.log('\n🎉 All email validation checks passed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Critical script runtime exception:', err);
  process.exit(1);
});

require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.postmarkapp.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function runTest() {
  console.log('--- Postmark SMTP Connection Test ---');
  
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ Error: SMTP_USER or SMTP_PASS is missing in .env');
    process.exit(1);
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Sentra AI" <alerts@sentra.ai>',
      to: "faazilzia01@gmail.com",
      subject: "🧪 Sentra AI: SMTP Connection Test",
      text: "If you are reading this, your Postmark SMTP integration is working perfectly!",
      html: "<b>Success!</b> Your Postmark SMTP integration is working perfectly."
    });
    console.log('✅ Success! Message sent:', info.messageId);
  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
  }
}

runTest();

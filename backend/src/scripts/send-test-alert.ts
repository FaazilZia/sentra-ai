import 'dotenv/config';
import { systemAlertService, SystemAlertType } from '../services/systemAlert.service';
import logger from '../utils/logger';

async function main() {
  const args = process.argv.slice(2);
  const typeArg = args.find(a => a.startsWith('--type='))?.split('=')[1] as SystemAlertType | undefined;
  const testAll = args.includes('--all');

  console.log('\n============================================================');
  console.log('🔔  Sentra AI: Send Test Alert Utility');
  console.log('============================================================\n');

  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Slack Webhook Configured: ${process.env.SLACK_WEBHOOK_URL ? 'YES' : 'NO (set SLACK_WEBHOOK_URL to enable)'}`);
  console.log(`SMTP Host Configured: ${process.env.SMTP_HOST ? 'YES' : 'NO (set SMTP_HOST to enable)'}`);
  console.log(`Alert Recipient: ${process.env.ALERT_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_TO || 'alerts@sentraatech.com'}\n`);

  const alertTypes: SystemAlertType[] = testAll
    ? ['service_down', 'ready_failing', 'error_rate_spike', 'dlq_growing', 'connector_scan_failing_repeatedly']
    : [typeArg || 'ready_failing'];

  let allSucceeded = true;

  for (const type of alertTypes) {
    console.log(`📡 Dispatching test alert for type: [${type}]...`);
    try {
      const res = await systemAlertService.sendTestAlert(type);
      console.log(`  -> Slack delivery: ${res.slack ? '✅ Delivered' : '⚠️  Skipped (webhook not set or mock mode)'}`);
      console.log(`  -> Email delivery: ${res.email ? '✅ Delivered' : '⚠️  Skipped (SMTP not set or mock mode)'}`);
      if (res.errors.length > 0) {
        console.log(`  -> Errors noted: ${res.errors.join(', ')}`);
      }
    } catch (err: any) {
      allSucceeded = false;
      console.error(`  ❌ Failed to dispatch test alert for ${type}:`, err.message || err);
    }
  }

  console.log('\n============================================================');
  console.log(allSucceeded ? '✅ Test alert command completed successfully.' : '⚠️ Test alert command completed with issues.');
  console.log('============================================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error running send-test-alert:', err);
  process.exit(1);
});

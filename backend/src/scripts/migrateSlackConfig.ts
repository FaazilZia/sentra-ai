import prisma from '../config/db';
import logger from '../utils/logger';
import { encryptCredentials } from '../utils/credentialHelper';

const ENCRYPTED_REGEX = /^[0-9a-fA-F]{24}:[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;

export async function migrateSlackConfig(): Promise<{ migratedFromOrg: number; encryptedInConfig: number }> {
  logger.info('[MIGRATION] Starting Slack config migration to single source of truth...');
  let migratedFromOrg = 0;
  let encryptedInConfig = 0;

  // 1. Migrate legacy organizations.slackWebhookUrl to slack_config
  const orgsWithSlack = await prisma.organizations.findMany({
    where: {
      slackWebhookUrl: { not: null },
    },
    select: {
      id: true,
      slackWebhookUrl: true,
    },
  });

  for (const org of orgsWithSlack) {
    if (!org.slackWebhookUrl) continue;
    const encrypted = encryptCredentials(org.slackWebhookUrl);

    await prisma.slack_config.upsert({
      where: { orgId: org.id },
      update: {
        webhookUrl: encrypted,
        enabled: true,
      },
      create: {
        orgId: org.id,
        webhookUrl: encrypted,
        channel: '#alerts-compliance',
        enabled: true,
        notifyOn: ['guardrail_block', 'policy_violation', 'incident_created'],
      },
    });

    // Clear legacy column to avoid stale data
    await prisma.organizations.update({
      where: { id: org.id },
      data: { slackWebhookUrl: null },
    });

    migratedFromOrg++;
  }

  // 2. Encrypt any unencrypted webhookUrl entries in slack_config
  const allSlackConfigs = await prisma.slack_config.findMany();
  for (const config of allSlackConfigs) {
    if (!ENCRYPTED_REGEX.test(config.webhookUrl.trim())) {
      const encrypted = encryptCredentials(config.webhookUrl.trim());
      await prisma.slack_config.update({
        where: { id: config.id },
        data: { webhookUrl: encrypted },
      });
      encryptedInConfig++;
    }
  }

  logger.info(`[MIGRATION] Slack config migration complete. Migrated from org: ${migratedFromOrg}, Encrypted in slack_config: ${encryptedInConfig}`);
  return { migratedFromOrg, encryptedInConfig };
}

if (require.main === module) {
  migrateSlackConfig()
    .then((res) => {
      console.log('Migration succeeded:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

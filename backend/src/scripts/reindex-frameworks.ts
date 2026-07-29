import prisma from '../config/db';
import logger from '../utils/logger';
import { seedGdpr } from '../services/gdprSeed.service';
import { seedHipaa } from '../services/hipaaSeed.service';
import { seedPci } from '../services/pciSeed.service';
import { seedDpdp } from '../services/dpdpSeed.service';
import { seedNistAiRmf } from '../services/nistAiRmfSeed.service';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  logger.info('[Reindex] Starting dynamic indexing of compliance framework modules...');
  console.log('🔄 Re-indexing GDPR, DPDP, HIPAA, PCI-DSS, and NIST AI RMF frameworks...');

  try {
    console.log('🔹 Seeding and Indexing NIST AI RMF...');
    await seedNistAiRmf(prisma);

    console.log('🔹 Seeding and Indexing GDPR...');
    await seedGdpr(DEFAULT_ORG_ID, prisma);

    console.log('🔹 Seeding and Indexing HIPAA...');
    await seedHipaa(DEFAULT_ORG_ID, prisma);

    console.log('🔹 Seeding and Indexing PCI-DSS...');
    await seedPci(DEFAULT_ORG_ID, prisma);

    console.log('🔹 Seeding and Indexing DPDP...');
    await seedDpdp(DEFAULT_ORG_ID, prisma);

    const [gdprCount, hipaaCount, pciCount, dpdpCount, nistCount] = await Promise.all([
      prisma.gdpr_controls.count(),
      prisma.hipaaControl.count(),
      prisma.pciControl.count(),
      prisma.dpdpControl.count(),
      prisma.nist_ai_rmf_subcategories.count(),
    ]);

    console.log('\n📊 Indexing Summary:');
    console.log(`- GDPR Controls: ${gdprCount}`);
    console.log(`- HIPAA Controls: ${hipaaCount}`);
    console.log(`- PCI-DSS Controls: ${pciCount}`);
    console.log(`- DPDP Controls: ${dpdpCount}`);
    console.log(`- NIST AI RMF Subcategories: ${nistCount}`);

    logger.info('[Reindex] Framework controls indexed successfully.');
    console.log('\n✅ All 5 compliance frameworks reindexed successfully.');
    process.exit(0);
  } catch (error: any) {
    logger.error('[Reindex] Failed to reindex frameworks:', error);
    console.error('❌ Error during indexing:', error.message);
    process.exit(1);
  }
}

main();

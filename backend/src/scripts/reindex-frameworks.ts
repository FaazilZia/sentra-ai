import prisma from '../config/db';
import logger from '../utils/logger';
import { seedCcpa } from '../services/ccpaSeed.service';
import { seedDora } from '../services/doraSeed.service';
import { seedOecd } from '../services/oecdSeed.service';
import { seedFtc } from '../services/ftcSeed.service';

async function main() {
  logger.info('[Reindex] Starting dynamic indexing of compliance framework modules...');
  console.log('🔄 Re-indexing DORA, CCPA, OECD, and FTC global frameworks...');

  try {
    // 1. Seed CCPA
    console.log('🔹 Seeding and Indexing CCPA...');
    await seedCcpa(prisma);

    // 2. Seed DORA
    console.log('🔹 Seeding and Indexing DORA...');
    await seedDora(prisma);

    // 3. Seed OECD
    console.log('🔹 Seeding and Indexing OECD...');
    await seedOecd(prisma);

    // 4. Seed FTC
    console.log('🔹 Seeding and Indexing FTC...');
    await seedFtc(prisma);

    // Query and print summary counts of what was indexed
    const [ccpaCount, doraCount, oecdCount, ftcCount] = await Promise.all([
      prisma.ccpa_controls.count(),
      prisma.dora_controls.count(),
      prisma.oecd_controls.count(),
      prisma.ftc_controls.count(),
    ]);

    console.log('\n📊 Indexing Summary:');
    console.log(`- CCPA Controls: ${ccpaCount}`);
    console.log(`- DORA Controls: ${doraCount}`);
    console.log(`- OECD Controls: ${oecdCount}`);
    console.log(`- FTC Controls: ${ftcCount}`);
    
    logger.info('[Reindex] Framework controls indexed successfully.');
    console.log('\n✅ All compliance frameworks reindexed successfully.');
    process.exit(0);
  } catch (error: any) {
    logger.error('[Reindex] Failed to reindex frameworks:', error);
    console.error('❌ Error during indexing:', error.message);
    process.exit(1);
  }
}

main();

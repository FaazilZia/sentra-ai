import 'dotenv/config';
import prisma, { initializePrisma } from '../config/db';

async function main() {
  try {
    await initializePrisma();
    const res = await prisma.$queryRaw<any[]>`
      SELECT tablename, rowsecurity FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN (
        'ai_systems', 'risk_assessments', 'risk_assessment_answers',
        'impact_assessments', 'controls', 'control_implementations',
        'vendor_ai_tools', 'model_cards', 'compliance_obligations'
      );
    `;
    console.log('=== RLS STATUS ===');
    console.log(JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error('Error running RLS status check:', err.message);
  } finally {
    try {
      await prisma.$disconnect();
    } catch (e) {}
  }
}

main();

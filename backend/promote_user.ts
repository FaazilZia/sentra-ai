import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = "livetest@sentra.ai";
  const user = await prisma.users.update({
    where: { email },
    data: { role: 'ADMIN' }
  });
  console.log(`User ${email} promoted to ADMIN:`, user);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

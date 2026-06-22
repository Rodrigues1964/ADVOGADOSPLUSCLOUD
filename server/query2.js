const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const master = await prisma.profile.findFirst({
    where: { email: 'master@advogadosplus.com' },
    include: { memberships: { include: { tenant: true } } }
  });
  console.log("=== MASTER USER ===");
  console.log(JSON.stringify(master, null, 2));

}

run().finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const master = await prisma.profile.findFirst({
    where: { email: 'master@advogadosplus.com' },
    include: { memberships: true }
  });
  console.log("=== MASTER USER ===");
  console.log(JSON.stringify(master, null, 2));

  // Let's also check if they can login via API. We can just test bcrypt
  const bcrypt = require('bcryptjs');
  if (master) {
    const isValid = await bcrypt.compare('password123', master.password_hash);
    console.log("Password valid:", isValid);
  } else {
    console.log("No MASTER user found!");
  }
}

run().finally(() => prisma.$disconnect());

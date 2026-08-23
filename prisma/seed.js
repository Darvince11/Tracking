require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required');
  if (password.length < 12) throw new Error('SEED_ADMIN_PASSWORD must contain at least 12 characters');

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { password: passwordHash, accountStatus: 'ACTIVE', loginAttempts: 0, lockedUntil: null },
    create: {
      employeeId: process.env.SEED_ADMIN_EMPLOYEE_ID || 'EMP-ADM-000001',
      firstName: process.env.SEED_ADMIN_FIRST_NAME || 'System',
      lastName: process.env.SEED_ADMIN_LAST_NAME || 'Administrator',
      email: email.toLowerCase(), password: passwordHash, role: 'ADMIN',
      department: process.env.SEED_ADMIN_DEPARTMENT || 'WEB_DEVELOPMENT',
      accountStatus: 'ACTIVE', passwordChangedAt: new Date()
    }
  });
  console.log(`Administrator account is ready: ${email.toLowerCase()}`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());

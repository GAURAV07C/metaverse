import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Create admin user
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: hashedPassword },
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'Admin',
    },
  });

  console.log('Admin user ready:', admin.username);

  // Create normal user
  const user = await prisma.user.upsert({
    where: { username: 'gaurav' },
    update: { password: hashedPassword },
    create: {
      username: 'gaurav',
      password: hashedPassword,
      role: 'User',
    },
  });

  console.log('Normal user ready:', user.username);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

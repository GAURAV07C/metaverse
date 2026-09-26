const { PrismaClient } = require('@repo/db');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, username: true, role: true } });
  const elements = await prisma.element.findMany();
  const avatars = await prisma.avatar.findMany();
  const maps = await prisma.map.findMany({ select: { id: true, name: true, width: true, height: true } });
  const spaces = await prisma.space.findMany({ select: { id: true, name: true, width: true, height: true, creatorId: true } });
  
  console.log('=== USERS ===');
  console.table(users);
  
  console.log('\n=== ELEMENTS ===');
  console.table(elements);

  console.log('\n=== AVATARS ===');
  console.table(avatars);

  console.log('\n=== MAPS ===');
  console.table(maps);

  console.log('\n=== SPACES ===');
  console.table(spaces);
}

main().catch(console.error).finally(() => prisma.$disconnect());

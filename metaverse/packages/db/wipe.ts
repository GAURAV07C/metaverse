import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function wipe() {
  await prisma.spaceElements.deleteMany({});
  await prisma.mapElements.deleteMany({});
  await prisma.element.deleteMany({});
  console.log("Database wiped successfully!");
}
wipe().catch(console.error).finally(() => prisma.$disconnect());

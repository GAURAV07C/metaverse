import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAvatars() {
  console.log('Seeding Avatars...');
  
  await prisma.avatar.createMany({
    data: [
      { id: 'avatar-boy', name: 'Boy', imageUrl: '/avatars/boy.jpg' },
      { id: 'avatar-girl', name: 'Girl', imageUrl: '/avatars/girl.svg' },
    ],
    skipDuplicates: true
  });
  
  console.log('✅ Avatars seeded.');
}

seedAvatars()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAvatars() {
  console.log('Cleaning old Avatars...');
  await prisma.avatar.deleteMany({}); // Delete all existing to avoid old heads!

  console.log('Seeding Cool Animated Full-Body Avatars...');
  
  await prisma.avatar.createMany({
    data: [
      { id: 'avatar-casual-1', name: 'Casual Worker', imageUrl: 'class:casual' },
      { id: 'avatar-ninja-1', name: 'Shadow Ninja', imageUrl: 'class:ninja' },
      { id: 'avatar-knight-1', name: 'Royal Knight', imageUrl: 'class:knight' },
      { id: 'avatar-wizard-1', name: 'Grand Wizard', imageUrl: 'class:wizard' },
      { id: 'avatar-robot-1', name: 'Tech Bot', imageUrl: 'class:robot' },
      { id: 'avatar-casual-2', name: 'Default User', imageUrl: 'class:casual' }
    ],
    skipDuplicates: true
  });
  
  console.log('✅ Cool Full-Body Avatars seeded.');
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

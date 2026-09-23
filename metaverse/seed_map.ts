import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding visual office map...");

  // 1. Create Maps
  const maps = [
    { name: 'Small Office (1-10 people)', width: 32, height: 18, thumbnails: '/small_map.jpg' },
    { name: 'Medium Office (10-25 people)', width: 48, height: 27, thumbnails: '/medium_map.jpg' },
    { name: 'Large Office (25+ people)', width: 64, height: 36, thumbnails: '/large_map.jpg' },
  ];

  for (const m of maps) {
    let map = await prisma.map.findFirst({
      where: { name: m.name }
    });

    if (!map) {
      map = await prisma.map.create({
        data: {
          name: m.name,
          width: m.width,
          height: m.height,
          thumbnails: m.thumbnails,
        }
      });
    } else {
      map = await prisma.map.update({
        where: { id: map.id },
        data: {
          thumbnails: m.thumbnails,
          width: m.width,
          height: m.height,
        }
      });
    }
    console.log('Map created:', map.name, map.id);
  }

  // 2. Create Elements (Furniture)
  const elements = [
    { id: 'el-desk', imageUrl: 'https://placehold.co/32x32/8B4513/FFF?text=D', width: 2, height: 1, static: true },
    { id: 'el-chair', imageUrl: 'https://placehold.co/32x32/2F4F4F/FFF?text=C', width: 1, height: 1, static: true },
    { id: 'el-plant', imageUrl: 'https://placehold.co/32x32/228B22/FFF?text=P', width: 1, height: 1, static: true },
    { id: 'el-board', imageUrl: 'https://placehold.co/64x32/FFF/000?text=Board', width: 2, height: 1, static: true },
  ];

  for (const el of elements) {
    await prisma.element.upsert({
      where: { id: el.id },
      update: {
        imageUrl: el.imageUrl,
        width: el.width,
        height: el.height,
        static: el.static,
      },
      create: {
        id: el.id,
        imageUrl: el.imageUrl,
        width: el.width,
        height: el.height,
        static: el.static,
      }
    });
  }
  
  console.log('Elements seeded successfully.');
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

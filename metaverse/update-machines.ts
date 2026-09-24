import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const elements = await prisma.element.findMany({
    where: { category: 'Machines' }
  });
  
  if (elements.length === 0) {
    console.log('No existing machines found, seeding...');
    const files = fs.readdirSync('apps/web/public/machine').filter(f => f.endsWith('.png'));
    const newElements = files.map((f, i) => ({
      width: 1,
      height: 1,
      static: true,
      imageUrl: `/machine/${f}`,
      name: `Machine ${i+1}`,
      category: 'Machines'
    }));
    const res = await prisma.element.createMany({ data: newElements });
    console.log(`Seeded ${res.count} machines`);
  } else {
    let count = 0;
    for (const el of elements) {
      if (el.imageUrl.startsWith('/') && !el.imageUrl.startsWith('/machine/')) {
        const newUrl = `/machine${el.imageUrl}`;
        await prisma.element.update({
          where: { id: el.id },
          data: { imageUrl: newUrl }
        });
        count++;
      }
    }
    console.log(`Updated ${count} machines in database`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

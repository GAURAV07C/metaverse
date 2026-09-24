import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const files = fs.readdirSync('apps/web/public/wall-decor').filter(f => f.endsWith('.png'));
  const items: Record<string, string> = {};
  
  files.forEach((f, i) => {
    items[f] = `Wall Art & Decor ${i + 1}`;
  });

  fs.writeFileSync('apps/web/wall-decor-names.json', JSON.stringify(items, null, 2));

  const newElements = files.map((f, i) => ({
    width: 1,
    height: 1,
    static: true,
    imageUrl: `/wall-decor/${f}`,
    name: `Wall Art & Decor ${i + 1}`,
    category: 'Wall Decor'
  }));

  const res = await prisma.element.createMany({ data: newElements });
  console.log(`Seeded ${res.count} wall decor items`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

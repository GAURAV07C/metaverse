import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const fileContent = fs.readFileSync('apps/web/food-names.json', 'utf8');
  const items = JSON.parse(fileContent);

  const newElements = items.map(item => ({
    width: 1,
    height: 1,
    static: true,
    imageUrl: `/food/${item.id}.png`,
    name: item.name,
    category: 'food'
  }));

  const res = await prisma.element.createMany({
    data: newElements
  });

  console.log(`Inserted ${res.count} food items.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

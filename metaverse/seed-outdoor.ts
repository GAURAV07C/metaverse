import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const fileContent = fs.readFileSync('apps/web/outdoor-names.json', 'utf8');
  const items = JSON.parse(fileContent);

  const newElements = Object.entries(items).map(([filename, name]) => ({
    width: 1,
    height: 1,
    static: true,
    imageUrl: `/outdoor/${filename}`,
    name: name as string,
    category: 'outdoor'
  }));

  const res = await prisma.element.createMany({
    data: newElements
  });

  console.log(`Inserted ${res.count} outdoor items.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

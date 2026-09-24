import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function updateNames() {
  const mappingPath = path.join(process.cwd(), 'apps/web/decor-names.json');
  if (!fs.existsSync(mappingPath)) {
    console.error('Mapping file not found at', mappingPath);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  let updatedCount = 0;

  for (const item of data) {
    if (item.name && !item.name.startsWith('Room Decor')) {
      await prisma.element.update({
        where: { id: item.id },
        data: { name: item.name }
      });
      console.log(`Updated ${item.id} -> ${item.name}`);
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} items.`);
}

updateNames()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

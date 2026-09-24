import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const elements = await prisma.element.findMany({
    where: { category: 'Desks' }
  });
  
  if (!fs.existsSync('apps/web/public/desks')) {
    fs.mkdirSync('apps/web/public/desks');
  }

  let count = 0;
  for (const el of elements) {
    if (el.imageUrl.startsWith('/') && !el.imageUrl.startsWith('/desks/')) {
      const filename = el.imageUrl.replace('/', ''); // gets the uuid.png
      
      const oldPathMachine = path.join('apps/web/public/machine', filename);
      const oldPathRoot = path.join('apps/web/public', filename);
      const newPath = path.join('apps/web/public/desks', filename);
      
      if (fs.existsSync(oldPathMachine)) {
        fs.renameSync(oldPathMachine, newPath);
      } else if (fs.existsSync(oldPathRoot)) {
        fs.renameSync(oldPathRoot, newPath);
      } else {
        console.log(`Could not find file for ${filename}`);
      }

      const newUrl = `/desks/${filename}`;
      await prisma.element.update({
        where: { id: el.id },
        data: { imageUrl: newUrl }
      });
      count++;
    }
  }
  console.log(`Updated ${count} desks in database and moved files`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

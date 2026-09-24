import { PrismaClient } from '@prisma/client';
import sizeOf from 'image-size';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const elements = await prisma.element.findMany();
  let updated = 0;

  for (const element of elements) {
    if (!element.imageUrl) continue;

    // the imageUrl starts with / e.g., /tables/uuid.png
    const imagePath = path.join(process.cwd(), 'apps', 'web', 'public', element.imageUrl.startsWith('/') ? element.imageUrl.substring(1) : element.imageUrl);
    
    if (fs.existsSync(imagePath)) {
      try {
        const buffer = fs.readFileSync(imagePath);
        const dimensions = sizeOf(buffer);
        if (dimensions.width && dimensions.height) {
          const expectedWidth = Math.max(1, Math.round(dimensions.width / 32));
          const expectedHeight = Math.max(1, Math.round(dimensions.height / 32));

          if (element.width !== expectedWidth || element.height !== expectedHeight) {
            await prisma.element.update({
              where: { id: element.id },
              data: {
                width: expectedWidth,
                height: expectedHeight
              }
            });
            console.log(`Updated ${element.name} from ${element.width}x${element.height} to ${expectedWidth}x${expectedHeight}`);
            updated++;
          }
        }
      } catch (e: any) {
        console.log(`Failed to read dimensions for ${element.name}: ${e.message}`);
      }
    } else {
      console.log(`File not found: ${imagePath}`);
    }
  }

  console.log(`Total elements updated: ${updated}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function getPngSize(filePath: string): { width: number, height: number } | null {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(24);
    fs.readSync(fd, buffer, 0, 24, 0);
    fs.closeSync(fd);
    
    // Check PNG signature
    if (
      buffer[0] === 0x89 && buffer[1] === 0x50 && 
      buffer[2] === 0x4E && buffer[3] === 0x47
    ) {
      // Width is at offset 16, Height is at offset 20 (4 bytes each, Big Endian)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function main() {
  const elements = await prisma.element.findMany();
  
  console.log(`Found ${elements.length} elements in the database.`);
  
  const publicDir = path.join(__dirname, "apps", "web", "public");
  let updatedCount = 0;

  for (const element of elements) {
    if (!element.imageUrl) continue;
    
    const relativePath = element.imageUrl.startsWith("/") 
      ? element.imageUrl.slice(1) 
      : element.imageUrl;
      
    const absolutePath = path.join(publicDir, relativePath);
    
    if (fs.existsSync(absolutePath) && absolutePath.endsWith('.png')) {
      const dimensions = getPngSize(absolutePath);
      
      if (dimensions && dimensions.width && dimensions.height) {
        // Many items might be 32x32, 64x64, 64x32 etc.
        // Divide by 32 to get Grid dimensions
        const gridWidth = Math.max(1, Math.round(dimensions.width / 32));
        const gridHeight = Math.max(1, Math.round(dimensions.height / 32));
        
        if (element.width !== gridWidth || element.height !== gridHeight) {
          await prisma.element.update({
            where: { id: element.id },
            data: {
              width: gridWidth,
              height: gridHeight
            }
          });
          console.log(`Updated ${element.name || element.id}: ${dimensions.width}x${dimensions.height}px -> ${gridWidth}x${gridHeight} tiles`);
          updatedCount++;
        }
      }
    }
  }

  console.log(`\nSuccess! Updated dimensions for ${updatedCount} elements.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

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
    
    if (
      buffer[0] === 0x89 && buffer[1] === 0x50 && 
      buffer[2] === 0x4E && buffer[3] === 0x47
    ) {
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
  const directoryPath = path.join(__dirname, "apps", "web", "public", "cabinets");
  
  if (!fs.existsSync(directoryPath)) {
    console.error("Directory does not exist");
    process.exit(1);
  }

  const files = fs.readdirSync(directoryPath);
  console.log(`Found ${files.length} files in cabinets directory`);
  
  let count = 0;
  for (const file of files) {
    if (file.endsWith(".png")) {
      const filePath = path.join(directoryPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.size > 0) {
        const imageUrl = `/cabinets/${file}`;
        const name = `Cabinet/Shelf ${count + 1}`;
        
        const dimensions = getPngSize(filePath);
        let gridWidth = 1;
        let gridHeight = 1;
        
        if (dimensions) {
          gridWidth = Math.max(1, Math.round(dimensions.width / 32));
          gridHeight = Math.max(1, Math.round(dimensions.height / 32));
        }
        
        const existing = await prisma.element.findFirst({
          where: { imageUrl }
        });
        
        if (!existing) {
          await prisma.element.create({
            data: {
              width: gridWidth,
              height: gridHeight,
              imageUrl: imageUrl,
              static: true,
              name: name,
              category: "Cabinets & Shelves"
            }
          });
          console.log(`Created element for ${file}: ${name} (${gridWidth}x${gridHeight})`);
          count++;
        } else {
          await prisma.element.update({
            where: { id: existing.id },
            data: { 
              name: name, 
              category: "Cabinets & Shelves",
              width: gridWidth,
              height: gridHeight
            }
          });
          console.log(`Updated element for ${file}: ${name} (${gridWidth}x${gridHeight})`);
        }
      } else {
        console.log(`Skipping ${file} - 0 bytes`);
      }
    }
  }
  console.log(`Finished processing cabinets. Processed ${count} items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

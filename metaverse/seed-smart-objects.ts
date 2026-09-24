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

const names: Record<string, string> = {
  "2ef0d5a1-bb1e-41d3-9a03-f9103017a0fd.png": "Water Cooler",
  "4baf0e50-e41f-4a6c-ac5d-fd09b11a8ab9.png": "Yellow CRT Monitor",
  "fd38deb3-362b-4a03-af14-bc99fee92a5e.png": "Dark Trash Can"
};

async function main() {
  const directoryPath = path.join(__dirname, "apps", "web", "public", "smart-objects");
  
  if (!fs.existsSync(directoryPath)) {
    console.error("Directory does not exist");
    process.exit(1);
  }

  const files = fs.readdirSync(directoryPath);
  console.log(`Found ${files.length} files in smart-objects directory`);
  
  for (const file of files) {
    if (file.endsWith(".png")) {
      const filePath = path.join(directoryPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.size > 0) {
        const imageUrl = `/smart-objects/${file}`;
        const name = names[file] || `Smart Object`;
        
        const dimensions = getPngSize(filePath);
        let gridWidth = 1;
        let gridHeight = 1;
        
        if (dimensions) {
          gridWidth = Math.max(1, Math.round(dimensions.width / 32));
          gridHeight = Math.max(1, Math.round(dimensions.height / 32));
        }
        
        // Remove old entries in seating that have the same filename if they exist
        await prisma.element.deleteMany({
          where: { imageUrl: `/seating/${file}` }
        });
        
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
              category: "Smart Objects"
            }
          });
          console.log(`Created element for ${file}: ${name} (${gridWidth}x${gridHeight})`);
        } else {
          await prisma.element.update({
            where: { id: existing.id },
            data: { 
              name: name, 
              category: "Smart Objects",
              width: gridWidth,
              height: gridHeight
            }
          });
          console.log(`Updated element for ${file}: ${name} (${gridWidth}x${gridHeight})`);
        }
      }
    }
  }
  console.log(`Finished processing smart objects.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

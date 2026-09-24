import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const directoryPath = path.join(__dirname, "apps", "web", "public", "wall-decor");
  
  // Create Wall Decor category if it doesn't exist
  let wallDecorCategory = await prisma.element.findFirst({
    where: { imageUrl: { contains: "wall-decor" } }
  });

  const files = fs.readdirSync(directoryPath);
  console.log(`Found ${files.length} files in wall-decor directory`);
  
  // Read names mapping
  const namesMap = JSON.parse(fs.readFileSync(path.join(__dirname, "apps", "web", "wall-decor-names.json"), 'utf8'));

  let count = 0;
  for (const file of files) {
    if (file.endsWith(".png")) {
      const filePath = path.join(directoryPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.size > 0 && namesMap[file]) {
        const imageUrl = `/wall-decor/${file}`;
        const name = namesMap[file];
        
        const existing = await prisma.element.findFirst({
          where: { imageUrl }
        });
        
        if (!existing) {
          await prisma.element.create({
            data: {
              width: 1,
              height: 1,
              imageUrl: imageUrl,
              static: true,
              name: name
            }
          });
          console.log(`Created element for ${file}: ${name}`);
          count++;
        } else {
          // Update the existing one with the proper name
          await prisma.element.update({
            where: { id: existing.id },
            data: { name: name }
          });
          console.log(`Updated element for ${file}: ${name}`);
        }
      } else {
        if (stats.size === 0) {
          console.log(`Skipping ${file} - 0 bytes`);
        } else {
          console.log(`Skipping ${file} - no mapping found`);
        }
      }
    }
  }
  console.log(`Finished processing wall-decor items. Created ${count} new items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

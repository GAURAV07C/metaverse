import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const nameMap: Record<string, string> = {
  "27ceebf9-b415-4256-bbcb-c97d599bfe4e.png": "Pac-Man Arcade",
  "3cfdfc82-20c6-4f50-bcd2-e99d4a862541.png": "Number 4 Block",
  "4fc94fae-dfae-4d14-aad1-2d5b5cce0e64.png": "Tetris Block",
  "64bfcc9d-61b3-472b-8ff1-cef6a71a1933.png": "Crossed Pencils Icon",
  "8fd63d66-0b27-41f6-bc1e-434692420e37.png": "Incognito Spy Icon",
  "a58efd59-725d-4fea-b6b6-7e7563e94a50.png": "Golf Hole",
  "a976733a-1295-40e3-ac3c-6fbeb8d53f19.png": "Slot Machine",
  "c79936be-4f53-437e-9980-af45795f4869.png": "Rainbow Question Block",
  "d9a19b7b-e93d-45cb-be47-ece33d51c799.png": "Wall Whiteboard",
  "db9bd095-8821-4dc3-a63f-66d5c853e894.png": "Large Stand Whiteboard",
  "e57e6b3e-abff-4190-b16e-a18590dd6a0f.png": "GitHub Logo Block",
  "f025393a-fb63-48f2-ba56-0c8a8d285312.png": "Gong on Stand",
  "f05ba95d-641f-43fe-9477-f33b777adb57.png": "Retro Arcade Screen"
};

async function main() {
  console.log("Starting to update interactive names...");
  let updatedCount = 0;

  for (const [filename, name] of Object.entries(nameMap)) {
    const imageUrl = `/interactive/${filename}`;
    
    const existing = await prisma.element.findFirst({
      where: { imageUrl }
    });
    
    if (existing) {
      await prisma.element.update({
        where: { id: existing.id },
        data: { name: name }
      });
      console.log(`Updated ${filename} -> ${name}`);
      updatedCount++;
    } else {
      console.log(`Could not find ${filename} in DB`);
    }
  }

  console.log(`Finished updating. Total updated: ${updatedCount}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.element.updateMany({
    where: {
      imageUrl: {
        contains: "wall-decor"
      }
    },
    data: {
      category: "Wall Decor"
    }
  });

  console.log(`Updated ${result.count} wall-decor elements with category 'Wall Decor'`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

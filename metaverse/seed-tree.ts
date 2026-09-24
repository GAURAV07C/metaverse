import { PrismaClient } from "@prisma/client";

const client = new PrismaClient();

async function main() {
  console.log("Seeding custom customizable tree...");

  await client.element.create({
    data: {
      width: 2,
      height: 2,
      static: true,
      imageUrl: "/tree-trunk.svg",
      colorMaskUrl: "/tree-leaves.svg",
      name: "Custom Tree",
      category: "Decoration",
    },
  });

  console.log("Tree created!");
}

main().catch(console.error).finally(() => client.$disconnect());

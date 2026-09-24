import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const nameMap: Record<string, string> = {
  "055d0a96-4d48-4392-a355-1ae695ef3861.png": "Wooden TV Stand",
  "0eeb7b02-a098-4169-ab4f-830d886b8d9d.png": "Tall Bookshelf",
  "207fc06c-cc92-4c7b-bf52-102228cabd25.png": "Grey Lockers",
  "2b558671-e120-4f7c-8e8a-b7447f88b9fe.png": "Blue Storage Trunk",
  "2e6ae09c-fcfe-45c2-bd23-c0191ac49997.png": "Coffee Station Shelf",
  "2ef0d5a1-bb1e-41d3-9a03-f9103017a0fd.png": "Water Cooler",
  "3c4d7925-722b-4503-8974-a1fb4e603950.png": "Apothecary Cabinet",
  "3f2ae858-ff4f-4ff4-9b53-972d19c4ad40.png": "Cozy Fireplace Bookshelf",
  "4baf0e50-e41f-4a6c-ac5d-fd09b11a8ab9.png": "Yellow CRT Monitor",
  "5b404621-3574-4a99-a0ee-682efef979ef.png": "Plant Display Shelf",
  "87bff425-b411-4fd1-b6fe-8dd4951d85f1.png": "Tall Wooden Wardrobe",
  "87e02a16-6b2c-44a2-a36b-833001057b78.png": "Steel Lockers",
  "89aaecc9-5202-48f8-b40e-6bedb9a42acd.png": "Grey 4-Drawer Cabinet",
  "99746f83-2799-4b63-a416-e88caf25642d.png": "Red Tool Scaffolding",
  "9a16a369-a14a-40c0-8f9a-fe0b1e8cc50b.png": "Wood & White Cabinet",
  "a08bc580-4c09-4d27-9e2e-540dd79e306d.png": "Grey 3-Drawer File Cabinet",
  "b96a81bb-d52f-4cfa-ad75-7a9967b1479a.png": "Antique Display Cabinet",
  "bfde287e-446b-41b5-9fd4-9c5fc662439e.png": "Mechanic Tool Workbench",
  "c142a90a-7aef-49ab-8841-f4dc2612582d.png": "Chemistry Flask Rack",
  "cb535938-96b4-4cbd-9f7d-00b2b47e161d.png": "Wooden Cubby Shelf",
  "de337aae-ed98-4f37-b80d-8a81ef8535d7.png": "Wide Grey File Cabinet",
  "ebe3fce9-5c42-4b1c-8f59-115658cad41a.png": "Modern Wood Console",
  "fa192085-126f-4a7a-8f0a-2de969b4882d.png": "Classic 3-Drawer Dresser",
  "fd38deb3-362b-4a03-af14-bc99fee92a5e.png": "Dark Waste Bin",
  "ffca5ab4-296b-4623-bee6-636a0bee4a71.png": "4-Tier Bookshelf"
};

async function main() {
  let count = 0;
  for (const [filename, newName] of Object.entries(nameMap)) {
    const imageUrl = `/cabinets/${filename}`;
    const element = await prisma.element.findFirst({
      where: { imageUrl }
    });

    if (element) {
      await prisma.element.update({
        where: { id: element.id },
        data: { name: newName }
      });
      console.log(`Updated ${filename} -> ${newName}`);
      count++;
    }
  }
  console.log(`Successfully updated ${count} names.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

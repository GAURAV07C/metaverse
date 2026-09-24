import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const nameMap: Record<string, string> = {
  "0237e593-7227-413c-919e-8f8cec188de9.png": "Black Round Stool",
  "05c00474-50b1-4602-ae8f-50dd2bddf49d.png": "Leather Office Chair",
  "07c98423-2300-404f-85e3-671dca536d33.png": "Blue Patterned Office Chair",
  "0b4f97fd-72f9-4df0-914c-a71771aae68e.png": "Green Armchair",
  "148468db-240f-4969-932b-303acc713308.png": "Hanging Basket Chair",
  "26075b61-ac42-4143-99b0-75e93b765904.png": "Brown Simple Stool",
  "2d28a862-472c-47d1-9563-f1b664233c03.png": "Wooden Armchair",
  "2ef0d5a1-bb1e-41d3-9a03-f9103017a0fd.png": "Water Cooler",
  "31d01d1c-e9a6-41cb-be05-4a29c5a8228d.png": "Pink Patterned Armchair",
  "32f0032c-468c-4833-93b7-78b5347b0c57.png": "Black 3-Seater Sofa",
  "36a7ffe8-c8f8-4bfc-95fa-21512419be52.png": "Green Armchair",
  "3af2caa5-5f52-405e-812c-53dc38abcb33.png": "Blue 3-Seater Sofa",
  "3d5cfcc7-73b9-4846-a3fd-851e8f56750f.png": "Black Cube Stool",
  "40b0896a-f98b-4d6f-95f4-4fbc26f26ba8.png": "Blue Director's Chair",
  "46ee5c13-265d-4f58-ba2a-751f8222a8f8.png": "Red Armchair",
  "4797b678-debf-45c4-b90e-a6640c73fcd4.png": "Dark Grey Cube Stool",
  "49357406-4e7f-4161-9ec9-aced3d27520a.png": "Blue Rounded Stool",
  "4a38c0f2-c2b2-4a15-9694-99006b62f02a.png": "Light Wood Bench",
  "4baf0e50-e41f-4a6c-ac5d-fd09b11a8ab9.png": "Yellow CRT Monitor",
  "5113df73-0862-4b37-b2a2-0e4337e77be3.png": "Red Gaming Chair",
  "51473f60-822c-4283-9339-b6a5bf3a1b3b.png": "Green Long Sofa",
  "522e9bdd-bbb4-480c-8918-8eecd0c17d7c.png": "Brown Recliner",
  "5686d448-094c-4b52-afe6-82855af94bd4.png": "Light Wooden Lounge Chair",
  "5b847783-6694-4d09-9384-124cb9017215.png": "Green Wooden Chair",
  "6a95f90d-a278-445a-b56c-19bb1891a9c6.png": "Grey Backless Stool",
  "6d425a30-153c-494a-81b1-99e6092fdf08.png": "Blue Tufted Sofa",
  "75db27da-9353-4147-8457-88a5db8713f8.png": "Ornate Blue Wooden Chair",
  "7759c201-7e7d-4a1f-b450-be51e63385e3.png": "Blue Armchair",
  "7a413bdf-1b9a-47e2-a432-3b6a6ab08e26.png": "Blue Wooden Chair",
  "82aaca99-ebd0-453b-8d89-5b55c111347d.png": "Brown Recliner",
  "881a2eec-f98a-42bf-a773-0bf0b4512f30.png": "Tall Brown Wooden Chair",
  "8b61a927-f4d3-4a2c-8d3a-dffb29a480ec.png": "Blue Round Footstool",
  "8cba476d-5103-46dd-bd7e-b45458365baf.png": "White L-Shaped Sofa",
  "9a6442a5-31a5-487d-b70b-45e9098db6e8.png": "Wooden Park Bench",
  "9d0d29ae-969d-4ad9-823b-599eca3b2a75.png": "Simple Wooden Chair",
  "a497e524-8830-4cb1-8b98-0848b31f70a1.png": "Brown Rounded Armchair",
  "b0e2b6d6-b7f0-4b25-bde6-37296108273f.png": "Brown Leather Couch",
  "b1f7ccc5-8f2e-42fd-9e00-a1dc97aff99e.png": "White Round Stool",
  "b32ae7cf-fa55-4402-8093-5d120927ff30.png": "Brown Couch with Pillows",
  "c0dcda50-8471-4674-896b-9663ed8eb5b0.png": "Wooden Chair with Wheels",
  "c3767ddc-be71-403d-b35a-b328ca53e91f.png": "Blue Chaise Lounge",
  "c6ee3bcb-d658-4549-9722-e32700ceb9f9.png": "Grey Leather Office Chair",
  "c7473bc2-19d1-4466-a3bc-adaaa930433d.png": "Dark Blue Office Chair",
  "c961989c-3b46-455c-8ce3-acf7ca238dc9.png": "Brown Bar Stool",
  "cb8d3ec0-5f17-471f-8327-23b5fce729c5.png": "Blue Modern Office Chair",
  "cf056c22-a3af-4854-b095-10a32760393b.png": "Round Wicker Egg Chair",
  "d37f001f-604f-415d-a6c1-7c50efbbb12a.png": "Grey Modern Office Chair",
  "dad95a6a-3803-435d-962e-105aae8edb23.png": "Green Fancy Wooden Bench",
  "df554e43-8c84-493c-ae54-646ebfdf5dfa.png": "Red Racing Gaming Chair",
  "e0903dd4-f9a3-4855-86de-806f55d00fb9.png": "White Round Pouf",
  "e100785f-4ea5-4f1c-a4da-97037223be01.png": "Simple Wooden Chair",
  "e34e84b1-242a-42e4-b18e-7bfd62575be9.png": "Dark Wooden Ornate Chair",
  "f29f23bd-2c8f-462a-b513-1008bcc8a904.png": "Blue Armchair",
  "fd38deb3-362b-4a03-af14-bc99fee92a5e.png": "Dark Trash Can"
};

async function main() {
  console.log("Starting to update seating names...");
  let updatedCount = 0;

  for (const [filename, name] of Object.entries(nameMap)) {
    const imageUrl = `/seating/${filename}`;
    
    // Some non-seating items may be mapped to Decor or Machines later, 
    // but right now they are marked as 'Seating'.
    
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

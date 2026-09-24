import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const nameMap: Record<string, string> = {
  "0a655fd8-6370-48df-bca1-250c6796d6b6.png": "Square Wooden Table",
  "0d4e4caa-c359-42f8-9b7c-982f88d38085.png": "Long Brown Desk",
  "294312ca-4152-42c5-b888-4dc83af78202.png": "TV Stand Table",
  "2b65ffe4-7afd-4faf-9cd4-1bb1275df5d5.png": "Large Light Wood Desk",
  "2f122d4a-71fe-4ba0-bdd9-152e1adf9d2c.png": "Light Wood Desk",
  "30fee4d1-bf2a-4dc8-9d09-dccad2ccb598.png": "Octagon End Long Table",
  "3262733d-9de8-4a61-b43a-301482970787.png": "Oval Brown Wood Table",
  "32eff312-63a2-4804-a87a-98505545513c.png": "Hexagon Dining Table",
  "3525f654-9a7c-4112-b781-2d2e899a9429.png": "Glass Display Table",
  "434d6129-e62b-470a-beaa-e8823295d3aa.png": "Small Round Wood Table",
  "4d53c1a2-23b6-40fd-9bb0-7184c4a777f9.png": "Small Square Wood Table",
  "50f114d1-6279-457c-b730-e0f0cebe864e.png": "Large Dining Table",
  "5a4ed256-1396-4f91-bbe8-0b4f51a2313b.png": "Wood Table with Drawers",
  "65bf8638-4f4b-4ca1-bb9c-d3fd8d08d030.png": "Medium Light Wood Desk",
  "6a5ec55c-2f27-4ee8-a2e9-bed7ef134b6f.png": "Small Light Wood Table",
  "6c04b6bf-3915-48ff-a2a0-ec9fd9a7c3bc.png": "Solid Wooden Desk",
  "7d53706c-79c9-4713-95ed-ba9e2e33095b.png": "Square Light Wood Table",
  "829d56ea-3d34-4add-bfa1-0cc6d490d2c8.png": "Simple Rectangular Table",
  "89905833-f0a0-4b93-b812-b452e14582c1.png": "Large Round Light Wood Table",
  "9984aafe-3273-482f-8307-0cf3b2b1ae45.png": "Large Rectangular Light Wood Table",
  "9f7bc7cf-00fc-4ae6-99fa-98a52c9bd0ee.png": "Small Round Wood Table",
  "a210fb73-3948-49b2-8f31-fa4807059bd2.png": "Long Wooden Table",
  "ac159342-2763-4da0-891a-af501c85caee.png": "White Table with Drawers",
  "afd0f352-0918-4274-b51d-506415662d7e.png": "Hexagonal Wooden Table",
  "b009ca97-0c4f-497d-bcb4-b2882df9c00c.png": "Simple Brown Table",
  "b4140e07-944c-468b-a028-eac365fe0aa7.png": "Long Plain Light Wood Table",
  "b941e139-c4b0-4f3c-ba21-76f5d1552b67.png": "Tree Stump Round Table",
  "bb2ae711-e893-4d52-9c46-d101625817a5.png": "Medium Wooden Table",
  "bdf678a4-4534-42ce-b92d-8d355a684e64.png": "Light Wooden Desk",
  "c8f9620a-8154-4096-9618-c4de2b7de135.png": "Industrial Wooden Table",
  "caa65d66-3ca1-41ab-baf0-0f839b37d9c2.png": "Large White Rectangular Table",
  "cd80c094-5d81-4efc-8e7b-b46548053893.png": "Angled Corner Dining Table",
  "cea9c578-35a8-4edb-9564-603eb9da2763.png": "Long Light Wood Table",
  "ceb22fb8-45eb-4cb8-b4ca-5e01086fedd9.png": "Large Brown Desk",
  "d43a9aeb-a36e-42c7-bac2-2948dbb53746.png": "Rounded Corner Light Wood Table",
  "da2122c2-6677-4333-8c60-19e9498faf69.png": "White Counter Table",
  "e0fd9f49-9da0-4dd8-8eea-f5001a6858ef.png": "Large Hexagon Table",
  "e18b5943-42d3-4832-9ebd-d636e440401c.png": "Small Ornate Round Table",
  "e515118b-8db5-4229-b190-8228f05a4990.png": "Large Square Light Wood Table",
  "f0f445bf-2388-4e1e-a2a1-3ffd0f938201.png": "Ornate Long Desk",
  "f6b3ab70-607c-4266-a25c-ecb5dbc113da.png": "Gray Round Side Table",
  "fa1d0ffc-0fda-40a0-af1f-92a0b0c1294b.png": "Simple Wooden Table",
  "fa627435-bb5e-46ee-9bd9-7d3256f3d43e.png": "Plain Wooden Desk",
  "fb9e0c83-e5f9-4b7b-9829-ae149003ed3b.png": "Small White Round Table",
  "fbf58a76-c9a3-4faf-a99a-e413ac9df256.png": "Small Brown Round Table"
};

async function main() {
  let count = 0;
  for (const [filename, newName] of Object.entries(nameMap)) {
    const imageUrl = `/tables/${filename}`;
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
    } else {
        console.log(`Could not find element for ${filename}`);
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

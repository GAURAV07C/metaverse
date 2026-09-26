import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const rooms = [
  { name: "Meeting Room", imageUrl: "/fake_meeting_room.png", width: 6, height: 6 },
  { name: "Public Room", imageUrl: "/fake_common_area.png", width: 8, height: 8 },
  { name: "Private Desk", imageUrl: "/fake_private_desk.png", width: 3, height: 3 },
  { name: "Team Area", imageUrl: "/fake_team_area.png", width: 7, height: 7 },
  { name: "Coworking Area", imageUrl: "/fake_open_desk.png", width: 10, height: 10 },
  { name: "Open Desk", imageUrl: "/fake_open_desk.png", width: 2, height: 2 },
];

async function main() {
  console.log("Cleaning up old Room elements...");
  // Archive old elements that were saved as "Rooms" to avoid foreign key issues
  await prisma.element.updateMany({
    where: { category: "Rooms" },
    data: { category: "Archived_Rooms" }
  });
  console.log("Old Room elements archived.");

  for (const room of rooms) {
    const existing = await prisma.map.findFirst({
      where: { name: room.name, type: "room" }
    });

    if (!existing) {
      await prisma.map.create({
        data: {
          name: room.name,
          width: room.width,
          height: room.height,
          thumbnails: room.imageUrl,
          type: "room"
        }
      });
      console.log(`Created room template: ${room.name}`);
    } else {
      console.log(`Room template already exists: ${room.name}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

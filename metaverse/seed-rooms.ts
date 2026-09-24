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
  for (const room of rooms) {
    const existing = await prisma.element.findFirst({
      where: { name: room.name, category: "Rooms" }
    });

    if (!existing) {
      await prisma.element.create({
        data: {
          name: room.name,
          category: "Rooms",
          width: room.width,
          height: room.height,
          imageUrl: room.imageUrl,
          static: true
        }
      });
      console.log(`Created room: ${room.name}`);
    } else {
      console.log(`Room already exists: ${room.name}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

const ASSET_DIR = path.join(process.cwd(), "apps", "web", "public", "elements");
const PUBLIC_PREFIX = "/elements/";
const MAP_NAME = "Gather Town v2 Clone";
const SPACE_NAME = "Gather Town v2 Clone";
const WIDTH = 58;
const HEIGHT = 34;
const TILE_SIZE = 32;

type DbElement = {
  id: string;
  width: number;
  height: number;
  static: boolean;
  imageUrl: string;
  name: string | null;
  category: string | null;
};

type Placement = {
  elementId: string;
  x: number;
  y: number;
};

function readPngSize(buffer: Buffer) {
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function titleCase(input: string) {
  return input
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function classify(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.includes("floor") || lower.includes("carpet") || lower.includes("wood") || lower.includes("grass") || lower.includes("tile")) return "Floors";
  if (lower.includes("wall") || lower.includes("door") || lower.includes("lock")) return "Walls";
  if (lower.includes("desk") || lower.includes("table") || lower.includes("chair")) return "Office";
  if (lower.includes("plant") || lower.includes("tree")) return "Decor";
  if (lower.includes("fake_")) return "Rooms";
  if (lower.includes("smoke")) return "Effects";
  return "Gather Assets";
}

function isStatic(category: string) {
  return category !== "Floors" && category !== "Effects";
}

function tileSpan(size: number) {
  return Math.max(1, Math.ceil(size / TILE_SIZE));
}

async function ensureElement(filename: string): Promise<DbElement | null> {
  const filePath = path.join(ASSET_DIR, filename);
  const buffer = await fs.readFile(filePath);
  const dimensions = readPngSize(buffer);
  if (!dimensions) return null;

  const category = classify(filename);
  const imageUrl = `${PUBLIC_PREFIX}${filename}`;
  const width = Math.min(8, tileSpan(dimensions.width));
  const height = Math.min(8, tileSpan(dimensions.height));

  const existing = await prisma.element.findFirst({ where: { imageUrl } });
  if (existing) {
    return prisma.element.update({
      where: { id: existing.id },
      data: {
        width,
        height,
        static: isStatic(category),
        name: titleCase(filename),
        category,
      },
    });
  }

  return prisma.element.create({
    data: {
      imageUrl,
      width,
      height,
      static: isStatic(category),
      name: titleCase(filename),
      category,
    },
  });
}

function pick(elements: DbElement[], matcher: (element: DbElement) => boolean) {
  return elements.find(matcher) ?? elements[0]!;
}

function pushRect(target: Placement[], element: DbElement, x1: number, y1: number, x2: number, y2: number) {
  for (let x = x1; x <= x2; x += element.width) {
    for (let y = y1; y <= y2; y += element.height) {
      target.push({ elementId: element.id, x, y });
    }
  }
}

function makeOfficeLayout(elements: DbElement[]) {
  const placements: Placement[] = [];
  const byUrl = (text: string) => (element: DbElement) => element.imageUrl.toLowerCase().includes(text);

  const wood = pick(elements, byUrl("floor_wood"));
  const carpet = pick(elements, (element) => element.category === "Floors" && element.imageUrl.toLowerCase().includes("carpet"));
  const wall = pick(elements, (element) => element.category === "Walls" || element.imageUrl.toLowerCase().includes("wall"));
  const desk = pick(elements, byUrl("desk"));
  const chair = pick(elements, byUrl("chair"));
  const table = pick(elements, byUrl("table"));
  const sofa = pick(elements, byUrl("sofa"));
  const plant = pick(elements, byUrl("plant"));
  const board = pick(elements, byUrl("whiteboard"));
  const decor = elements.filter((element) => element.category === "Gather Assets").slice(0, 80);

  pushRect(placements, wood, 0, 0, WIDTH - 1, HEIGHT - 1);
  pushRect(placements, carpet, 3, 3, 20, 14);
  pushRect(placements, carpet, 35, 4, 53, 15);

  for (let x = 0; x < WIDTH; x += 1) {
    placements.push({ elementId: wall.id, x, y: 0 });
    placements.push({ elementId: wall.id, x, y: HEIGHT - 1 });
  }
  for (let y = 1; y < HEIGHT - 1; y += 1) {
    placements.push({ elementId: wall.id, x: 0, y });
    placements.push({ elementId: wall.id, x: WIDTH - 1, y });
  }

  for (let x = 6; x <= 22; x += 5) {
    for (let y = 18; y <= 28; y += 5) {
      placements.push({ elementId: desk.id, x, y });
      placements.push({ elementId: chair.id, x, y: y + 2 });
    }
  }

  for (let x = 36; x <= 50; x += 6) {
    placements.push({ elementId: table.id, x, y: 7 });
    placements.push({ elementId: chair.id, x: x - 1, y: 7 });
    placements.push({ elementId: chair.id, x: x + 3, y: 7 });
    placements.push({ elementId: chair.id, x, y: 10 });
  }

  placements.push({ elementId: sofa.id, x: 9, y: 6 });
  placements.push({ elementId: sofa.id, x: 14, y: 6 });
  placements.push({ elementId: board.id, x: 39, y: 3 });

  [
    [3, 3],
    [54, 3],
    [3, 30],
    [54, 30],
    [27, 6],
    [29, 25],
    [45, 20],
  ].forEach(([x, y]) => placements.push({ elementId: plant.id, x: x!, y: y! }));

  decor.forEach((element, index) => {
    const col = index % 10;
    const row = Math.floor(index / 10);
    const x = 5 + col * 5;
    const y = 2 + row * 4;
    if (x < WIDTH - element.width - 1 && y < HEIGHT - element.height - 1) {
      placements.push({ elementId: element.id, x, y });
    }
  });

  return placements;
}

async function replaceMapTemplate(elements: DbElement[]) {
  const placements = makeOfficeLayout(elements);
  const existing = await prisma.map.findFirst({ where: { name: MAP_NAME } });

  const map = existing
    ? await prisma.map.update({
        where: { id: existing.id },
        data: {
          width: WIDTH,
          height: HEIGHT,
          thumbnails: "/medium_map.png",
        },
      })
    : await prisma.map.create({
        data: {
          name: MAP_NAME,
          width: WIDTH,
          height: HEIGHT,
          thumbnails: "/medium_map.png",
        },
      });

  await prisma.mapElements.deleteMany({ where: { mapId: map.id } });
  await prisma.mapElements.createMany({
    data: placements.map((placement) => ({ ...placement, mapId: map.id })),
  });

  return { map, placements };
}

async function replaceLocalSpace(ownerId: string, placements: Placement[]) {
  const existing = await prisma.space.findFirst({
    where: { name: SPACE_NAME, creatorId: ownerId },
  });

  const space = existing
    ? await prisma.space.update({
        where: { id: existing.id },
        data: {
          width: WIDTH,
          height: HEIGHT,
          thumbnail: "/medium_map.png",
        },
      })
    : await prisma.space.create({
        data: {
          name: SPACE_NAME,
          width: WIDTH,
          height: HEIGHT,
          thumbnail: "/medium_map.png",
          creatorId: ownerId,
        },
      });

  await prisma.spaceElements.deleteMany({ where: { spaceId: space.id } });
  await prisma.privateZone.deleteMany({ where: { spaceId: space.id } });
  await prisma.meeting.deleteMany({ where: { spaceId: space.id } });
  await prisma.deskAssignment.deleteMany({ where: { spaceId: space.id } });
  await prisma.inviteLink.deleteMany({ where: { spaceId: space.id } });
  await prisma.smartObject.deleteMany({ where: { spaceId: space.id } });
  await prisma.spaceElements.createMany({
    data: placements.map((placement) => ({ ...placement, spaceId: space.id })),
  });

  await prisma.privateZone.createMany({
    data: [
      { spaceId: space.id, name: "Lobby", startX: 2, startY: 2, endX: 18, endY: 14 },
      { spaceId: space.id, name: "Media Room", startX: 35, startY: 4, endX: 53, endY: 15 },
      { spaceId: space.id, name: "Central Couches", startX: 8, startY: 5, endX: 20, endY: 12 },
      { spaceId: space.id, name: "Team", startX: 5, startY: 18, endX: 24, endY: 31 },
      { spaceId: space.id, name: "Coffee Huddle", startX: 39, startY: 18, endX: 52, endY: 29 },
    ],
  });

  await prisma.spaceSettings.upsert({
    where: { spaceId: space.id },
    update: { layoutType: "Hybrid", theme: "Startup", sizeRange: "1-10", colorMode: "Light" },
    create: { spaceId: space.id, layoutType: "Hybrid", theme: "Startup", sizeRange: "1-10", colorMode: "Light" },
  });

  await prisma.deskAssignment.createMany({
    data: [
      { spaceId: space.id, label: "Desk 1", teamName: "Team", x: 6, y: 18 },
      { spaceId: space.id, label: "Desk 2", teamName: "Team", x: 11, y: 18 },
      { spaceId: space.id, label: "Desk 3", teamName: "Team", x: 16, y: 18 },
      { spaceId: space.id, label: "Desk 4", teamName: "Team", x: 21, y: 18 },
      { spaceId: space.id, label: "Desk 5", teamName: "Team", x: 6, y: 23 },
    ],
  });

  await prisma.inviteLink.create({
    data: { spaceId: space.id, token: `local-${space.id}`, role: "Member" },
  });

  return space;
}

async function main() {
  const files = (await fs.readdir(ASSET_DIR)).filter((file) => file.toLowerCase().endsWith(".png"));
  const elements: DbElement[] = [];

  for (const file of files) {
    const element = await ensureElement(file);
    if (element) elements.push(element);
  }

  if (elements.length === 0) {
    throw new Error(`No PNG assets found in ${ASSET_DIR}`);
  }

  const { map, placements } = await replaceMapTemplate(elements);
  const owner = await prisma.user.findFirst({ orderBy: [{ role: "asc" }, { username: "asc" }] });
  const space = owner ? await replaceLocalSpace(owner.id, placements) : null;

  console.log(JSON.stringify({
    mapId: map.id,
    spaceId: space?.id ?? null,
    assets: elements.length,
    placements: placements.length,
    owner: owner?.username ?? null,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

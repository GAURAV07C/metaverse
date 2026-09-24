import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Real Gather.town sprite assets (downloaded from Gather CDN)
const ELEMENT_ASSETS = {
  // Furniture
  desk_monitor:    '/elements/526991e5-81c7-4f4f-be84-1e35e04b648b.png',  // Monitor + PC setup
  desk_dj:         '/elements/86e320b1-5524-4d41-8ef0-78ace09c6f4e.png',  // DJ / Music setup
  foosball:        '/elements/088b3582-8299-4086-9ec4-211a1c8d93b6.png',  // Foosball table
  robot_arm:       '/elements/4c2bc660-714a-4ed1-8be0-09d612ef52f7.png',  // Robot arm
  stationery_shelf:'/elements/c8503126-21ca-4bc3-889e-5435c2364178.png',  // Office shelf
  shelf_cups:      '/elements/f88a9801-cf18-4f3f-b9e4-25ff8e00a356.png',  // Cup shelf
  vase:            '/elements/698e3041-cc4e-4bd0-933b-acdbca3568d8.png',  // Decorative vase

  // Plants
  plant_flower:    '/elements/dbd502f2-f0e9-4d4e-bc51-d4a39e6507f6.png',  // Flower pot
  plant_tall:      '/elements/aed2b3ed-a6c9-490c-86f2-b355be796dff.png',  // Tall hedge
  plant_bamboo:    '/elements/cbe8e4a6-552d-4679-877f-ff94bf26c62f.png',  // Bamboo planter
  plant_trellis:   '/elements/902d7b5a-d135-4fed-b106-9dd236abdfea.png',  // Trellis with flowers
  grass_box:       '/elements/aef1fa32-2926-447d-9a32-565cff6dfa8a.png',  // Grass planter box

  // Bikes & Outdoor
  bike_rack:       '/elements/11776b60-349c-4eb9-ae87-14ffcd223609.png',  // Bike rack

  // Chairs & Seating
  chair:           '/elements/59ede099-e27b-4a86-92be-f5c9fffa4c2f.png',
  sofa:            '/elements/b2c24527-e957-4655-9b49-81bd5138f5f1.png',

  // Tables
  table:           '/elements/85ca9ad4-48a7-4160-8ddf-d83cd06c0ee3.png',

  // Walls (using original ones as Gather sprites for walls are tiny colored tiles)
  wall_glass:      '/elements/wall_glass.jpg',
  wall_brick:      '/elements/wall_brick.jpg',

  // Floors
  floor_wood:      '/elements/floor_wood.jpg',
  floor_carpet:    '/elements/floor_wood.jpg',
  floor_grass:     '/elements/floor_grass.jpg',

  // Whiteboard / Display
  whiteboard:      '/elements/whiteboard.jpg',

  // More Gather sprites for decorating
  item_a:          '/elements/80a16ce5-cc62-474c-8dc4-42c97f4e47c3.png',
  item_b:          '/elements/32531436-3901-47d5-b8d5-2ca33777d452.png',
  item_c:          '/elements/1d18820e-9976-40dd-881f-a0db9af27276.png',
  item_d:          '/elements/ecef1f0c-8a7a-415a-9825-985af969a3a0.png',
  item_e:          '/elements/c579a61b-7d95-4e2d-828a-3824ac2db977.png',
  item_f:          '/elements/b1c0fd8a-e527-4812-842e-c71bf35851be.png',
  item_g:          '/elements/923df6db-5c50-4633-b85e-e160def7e589.png',
  item_h:          '/elements/d268af79-97eb-4f71-aa78-4f56684011b7.png',
  item_i:          '/elements/692e9103-14bc-4e7c-9d50-926e4f8cad9c.png',
  item_j:          '/elements/f983a5f8-6a22-4edc-8e2c-ab9c692c8f8f.png',
};

async function main() {
  console.log("Seeding Database with REAL Gather.town sprites...");

  // 1. Create / Update Elements (Using real Gather sprites)
  const elements = [
    // Furniture
    { id: 'el-desk',        name: 'Desk Setup',      category: 'Furniture', imageUrl: ELEMENT_ASSETS.desk_monitor,     width: 2, height: 1, static: true },
    { id: 'el-desk-dj',     name: 'DJ Desk',         category: 'Furniture', imageUrl: ELEMENT_ASSETS.desk_dj,         width: 2, height: 1, static: true },
    { id: 'el-foosball',    name: 'Foosball Table',  category: 'Furniture', imageUrl: ELEMENT_ASSETS.foosball,         width: 2, height: 2, static: true },
    { id: 'el-robot',       name: 'Robot Arm',       category: 'Furniture', imageUrl: ELEMENT_ASSETS.robot_arm,        width: 2, height: 1, static: true },
    { id: 'el-shelf',       name: 'Office Shelf',    category: 'Furniture', imageUrl: ELEMENT_ASSETS.stationery_shelf, width: 2, height: 1, static: true },
    { id: 'el-shelf-cups',  name: 'Cup Shelf',       category: 'Furniture', imageUrl: ELEMENT_ASSETS.shelf_cups,       width: 2, height: 2, static: true },
    { id: 'el-vase',        name: 'Decorative Vase', category: 'Decor',     imageUrl: ELEMENT_ASSETS.vase,             width: 1, height: 1, static: true },

    // Seating
    { id: 'el-chair',       name: 'Office Chair',    category: 'Seating',   imageUrl: ELEMENT_ASSETS.chair,    width: 1, height: 1, static: false },
    { id: 'el-sofa',        name: 'Lounge Sofa',     category: 'Seating',   imageUrl: ELEMENT_ASSETS.sofa,     width: 2, height: 1, static: false },

    // Tables
    { id: 'el-table',       name: 'Meeting Table',   category: 'Tables',    imageUrl: ELEMENT_ASSETS.table,    width: 3, height: 2, static: true },
    { id: 'el-board',       name: 'Whiteboard',      category: 'Furniture', imageUrl: ELEMENT_ASSETS.whiteboard, width: 2, height: 1, static: true },

    // Plants
    { id: 'el-plant',       name: 'Flower Pot',      category: 'Plants',    imageUrl: ELEMENT_ASSETS.plant_flower,  width: 1, height: 1, static: true },
    { id: 'el-plant-tall',  name: 'Tall Hedge',      category: 'Plants',    imageUrl: ELEMENT_ASSETS.plant_tall,    width: 1, height: 2, static: true },
    { id: 'el-bamboo',      name: 'Bamboo Planter',  category: 'Plants',    imageUrl: ELEMENT_ASSETS.plant_bamboo,  width: 1, height: 2, static: true },
    { id: 'el-trellis',     name: 'Trellis',         category: 'Plants',    imageUrl: ELEMENT_ASSETS.plant_trellis, width: 2, height: 2, static: true },
    { id: 'el-grass-box',   name: 'Grass Box',       category: 'Plants',    imageUrl: ELEMENT_ASSETS.grass_box,     width: 2, height: 1, static: true },

    // Outdoor / Fun
    { id: 'el-bike',        name: 'Bike Rack',       category: 'Outdoor',   imageUrl: ELEMENT_ASSETS.bike_rack,  width: 2, height: 1, static: true },

    // Floors
    { id: 'floor-wood',     name: 'Wood Floor',      category: 'Floors',    imageUrl: ELEMENT_ASSETS.floor_wood,   width: 1, height: 1, static: false },
    { id: 'floor-carpet',   name: 'Carpet Floor',    category: 'Floors',    imageUrl: ELEMENT_ASSETS.floor_carpet, width: 1, height: 1, static: false },
    { id: 'floor-grass',    name: 'Grass Floor',     category: 'Floors',    imageUrl: ELEMENT_ASSETS.floor_grass,  width: 1, height: 1, static: false },

    // Walls
    { id: 'wall-brick',     name: 'Brick Wall',      category: 'Walls',     imageUrl: ELEMENT_ASSETS.wall_brick, width: 1, height: 1, static: true },
    { id: 'wall-glass',     name: 'Glass Wall',      category: 'Walls',     imageUrl: ELEMENT_ASSETS.wall_glass, width: 1, height: 1, static: true },

    // Extra Gather decorations (small sprites)
    { id: 'el-decor-a',     name: 'Book Stack',      category: 'Decor',     imageUrl: ELEMENT_ASSETS.item_a, width: 1, height: 1, static: true },
    { id: 'el-decor-b',     name: 'Coffee Mug',      category: 'Decor',     imageUrl: ELEMENT_ASSETS.item_b, width: 1, height: 1, static: true },
    { id: 'el-decor-c',     name: 'Laptop',          category: 'Decor',     imageUrl: ELEMENT_ASSETS.item_c, width: 1, height: 1, static: true },
    { id: 'el-decor-d',     name: 'Notepad',         category: 'Decor',     imageUrl: ELEMENT_ASSETS.item_d, width: 1, height: 1, static: true },
    { id: 'el-decor-e',     name: 'Pen Holder',      category: 'Decor',     imageUrl: ELEMENT_ASSETS.item_e, width: 1, height: 1, static: true },
    { id: 'el-decor-f',     name: 'Folder',          category: 'Decor',     imageUrl: ELEMENT_ASSETS.item_f, width: 1, height: 1, static: true },
    { id: 'el-decor-i',     name: 'Water Bottle',    category: 'Decor',     imageUrl: ELEMENT_ASSETS.item_i, width: 1, height: 1, static: true },
    { id: 'el-decor-j',     name: 'Trash Can',       category: 'Decor',     imageUrl: ELEMENT_ASSETS.item_j, width: 1, height: 1, static: true },
  ];
  const fs = require('fs');
  const path = require('path');
  const sizeOf = require('image-size');

  const elementsDir = path.join(__dirname, 'apps/web/public/elements');
  const files = fs.readdirSync(elementsDir);
  const scrapedElements = files
    .filter((f: string) => (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.svg')) && !f.startsWith('fake_') && f !== 'pre-packed-texture-v20.png')
    .map((f: string, i: number) => {
      let w = 1, h = 1;
      try {
        let sizeOfFunc = typeof sizeOf === 'function' ? sizeOf : sizeOf.default || sizeOf.imageSize;
        const dimensions = sizeOfFunc(path.join(elementsDir, f));
        w = Math.max(1, Math.round(dimensions.width / 32));
        h = Math.max(1, Math.round(dimensions.height / 32));
      } catch (e) {
        console.warn('Could not read size for', f);
      }
      return {
        id: `el-scraped-${i}`,
        name: `Gather Asset ${i+1}`,
        category: 'Gather Props',
        imageUrl: `/elements/${f}`,
        width: w,
        height: h,
        static: true
      };
    });

  const allElements = [...elements, ...scrapedElements];

  // Optimize DB calls by deleting all scraped elements first, then creating them.
  // Wait, deleting elements would break existing spaces if they use them. We can use createMany with skipDuplicates.
  await prisma.element.createMany({
    data: allElements,
    skipDuplicates: true,
  });

  // Since we also want to update existing, let's just do a bulk transaction or sequential with delay
  for (const el of allElements) {
    try {
      await prisma.element.upsert({
        where: { id: el.id },
        update: { imageUrl: el.imageUrl, width: el.width, height: el.height, static: el.static, name: el.name, category: el.category },
        create: el,
      });
    } catch (e) {
      console.log(`Failed to upsert ${el.id}, skipping...`);
    }
  }

  console.log(`✅ Elements seeded. Total: ${allElements.length}`);

  // 2. Create Map Template
  const mapData = {
    name: 'Medium Office (10-25 people)',
    width: 48,
    height: 27,
    thumbnails: '',
  };

  let map = await prisma.map.findFirst({ where: { name: mapData.name } });
  if (!map) {
    map = await prisma.map.create({ data: mapData });
  } else {
    map = await prisma.map.update({
      where: { id: map.id },
      data: mapData,
    });
  }
  console.log('✅ Map template created:', map.name, map.id);

  // 3. Clear existing MapElements and build office layout
  await prisma.mapElements.deleteMany({ where: { mapId: map.id } });

  const layoutElements: { elementId: string; x: number; y: number }[] = [];

  // Helper functions
  const addRect = (id: string, x1: number, y1: number, x2: number, y2: number) => {
    for (let x = x1; x <= x2; x++) {
      for (let y = y1; y <= y2; y++) {
        layoutElements.push({ elementId: id, x, y });
      }
    }
  };

  const addLine = (id: string, x1: number, y1: number, x2: number, y2: number) => {
    if (x1 === x2) {
      for (let y = y1; y <= y2; y++) layoutElements.push({ elementId: id, x: x1, y });
    } else if (y1 === y2) {
      for (let x = x1; x <= x2; x++) layoutElements.push({ elementId: id, x, y: y1 });
    }
  };

  // --- MAP GENERATION (48 x 27) --- //

  // Outer Boundary Brick Walls
  addLine('wall-brick', 2, 2, 45, 2); // Top
  addLine('wall-brick', 2, 25, 45, 25); // Bottom
  addLine('wall-brick', 2, 2, 2, 25); // Left
  addLine('wall-brick', 45, 2, 45, 25); // Right

  // Main Wooden Floor (entire inside)
  addRect('floor-wood', 3, 3, 44, 24);

  // --- Central Co-working Area (Desks with Real Sprites) --- //
  const startDeskX = 14;
  const startDeskY = 6;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const dx = startDeskX + col * 5;
      const dy = startDeskY + row * 4;
      layoutElements.push({ elementId: 'el-desk', x: dx, y: dy });
      layoutElements.push({ elementId: 'el-chair', x: dx, y: dy + 1 });
      layoutElements.push({ elementId: 'el-chair', x: dx + 1, y: dy + 1 });
    }
  }

  // --- Left Meeting Room (Glass Wall & Carpet) --- //
  addRect('floor-carpet', 4, 4, 11, 12);
  addLine('wall-glass', 12, 3, 12, 13);
  addLine('wall-glass', 3, 13, 12, 13);
  // Doorway
  const leftDoorIndex = layoutElements.findIndex(e => e.x === 12 && e.y === 8);
  if (leftDoorIndex >= 0) layoutElements.splice(leftDoorIndex, 1);
  // Meeting Table & Chairs
  layoutElements.push({ elementId: 'el-table', x: 6, y: 7 });
  layoutElements.push({ elementId: 'el-chair', x: 6, y: 6 });
  layoutElements.push({ elementId: 'el-chair', x: 7, y: 6 });
  layoutElements.push({ elementId: 'el-chair', x: 8, y: 6 });
  layoutElements.push({ elementId: 'el-chair', x: 6, y: 9 });
  layoutElements.push({ elementId: 'el-chair', x: 7, y: 9 });
  layoutElements.push({ elementId: 'el-chair', x: 8, y: 9 });
  layoutElements.push({ elementId: 'el-board', x: 4, y: 5 });
  // Decoration
  layoutElements.push({ elementId: 'el-decor-a', x: 10, y: 4 });
  layoutElements.push({ elementId: 'el-vase', x: 4, y: 12 });

  // --- Right Meeting Room (Glass Wall & Carpet) --- //
  addRect('floor-carpet', 36, 4, 44, 12);
  addLine('wall-glass', 35, 3, 35, 13);
  addLine('wall-glass', 35, 13, 44, 13);
  // Doorway
  const rightDoorIndex = layoutElements.findIndex(e => e.x === 35 && e.y === 8);
  if (rightDoorIndex >= 0) layoutElements.splice(rightDoorIndex, 1);
  // Meeting Table & Chairs
  layoutElements.push({ elementId: 'el-table', x: 39, y: 7 });
  layoutElements.push({ elementId: 'el-chair', x: 39, y: 6 });
  layoutElements.push({ elementId: 'el-chair', x: 40, y: 6 });
  layoutElements.push({ elementId: 'el-chair', x: 41, y: 6 });
  layoutElements.push({ elementId: 'el-chair', x: 39, y: 9 });
  layoutElements.push({ elementId: 'el-chair', x: 40, y: 9 });
  layoutElements.push({ elementId: 'el-chair', x: 41, y: 9 });
  layoutElements.push({ elementId: 'el-board', x: 36, y: 5 });
  // Decoration
  layoutElements.push({ elementId: 'el-decor-b', x: 43, y: 4 });
  layoutElements.push({ elementId: 'el-vase', x: 36, y: 12 });

  // --- Bottom Lounge Area (Grass) --- //
  addRect('floor-grass', 4, 18, 44, 24);

  // Lounge Sofas and Tables
  layoutElements.push({ elementId: 'el-sofa', x: 8, y: 20 });
  layoutElements.push({ elementId: 'el-sofa', x: 12, y: 20 });
  layoutElements.push({ elementId: 'el-table', x: 8, y: 22 });
  layoutElements.push({ elementId: 'el-sofa', x: 34, y: 20 });
  layoutElements.push({ elementId: 'el-sofa', x: 38, y: 20 });
  layoutElements.push({ elementId: 'el-table', x: 36, y: 22 });

  // Fun area in bottom-center
  layoutElements.push({ elementId: 'el-foosball', x: 22, y: 20 });
  layoutElements.push({ elementId: 'el-desk-dj', x: 18, y: 22 });
  layoutElements.push({ elementId: 'el-shelf-cups', x: 26, y: 22 });

  // --- Plants & Decorations (real Gather sprites) --- //
  // Corner plants
  layoutElements.push({ elementId: 'el-plant', x: 3, y: 3 });
  layoutElements.push({ elementId: 'el-plant', x: 44, y: 3 });
  layoutElements.push({ elementId: 'el-plant-tall', x: 13, y: 3 });
  layoutElements.push({ elementId: 'el-plant-tall', x: 34, y: 3 });
  layoutElements.push({ elementId: 'el-bamboo', x: 3, y: 14 });
  layoutElements.push({ elementId: 'el-bamboo', x: 44, y: 14 });
  layoutElements.push({ elementId: 'el-trellis', x: 13, y: 14 });
  layoutElements.push({ elementId: 'el-trellis', x: 34, y: 14 });

  // Garden / lounge plants
  layoutElements.push({ elementId: 'el-grass-box', x: 4, y: 18 });
  layoutElements.push({ elementId: 'el-grass-box', x: 43, y: 18 });
  layoutElements.push({ elementId: 'el-plant', x: 23, y: 18 });
  layoutElements.push({ elementId: 'el-plant', x: 24, y: 18 });

  // Bike rack near entrance
  layoutElements.push({ elementId: 'el-bike', x: 4, y: 16 });

  // Scatter more decorations from downloaded sprites
  layoutElements.push({ elementId: 'el-decor-c', x: 20, y: 3 });
  layoutElements.push({ elementId: 'el-decor-d', x: 25, y: 3 });
  layoutElements.push({ elementId: 'el-decor-e', x: 30, y: 3 });
  layoutElements.push({ elementId: 'el-decor-f', x: 15, y: 16 });
  layoutElements.push({ elementId: 'el-decor-g', x: 20, y: 16 });
  layoutElements.push({ elementId: 'el-decor-h', x: 25, y: 16 });
  layoutElements.push({ elementId: 'el-decor-i', x: 30, y: 16 });
  layoutElements.push({ elementId: 'el-decor-j', x: 35, y: 16 });
  layoutElements.push({ elementId: 'el-robot', x: 42, y: 16 });
  layoutElements.push({ elementId: 'el-shelf', x: 3, y: 16 });

  // Insert into DB
  const mapElData = layoutElements.map(item => ({
    mapId: map.id,
    elementId: item.elementId,
    x: item.x,
    y: item.y,
  }));
  await prisma.mapElements.createMany({ data: mapElData });
  console.log('✅ Map elements seeded into template.');

  // 4. Update all existing Spaces with these elements and Private Zones
  const spaces = await prisma.space.findMany();
  for (const sp of spaces) {
    await prisma.space.update({
      where: { id: sp.id },
      data: { thumbnail: null }
    });

    await prisma.spaceElements.deleteMany({ where: { spaceId: sp.id } });

    const spaceElData = layoutElements.map(item => ({
      spaceId: sp.id,
      elementId: item.elementId,
      x: item.x,
      y: item.y,
    }));
    await prisma.spaceElements.createMany({ data: spaceElData });

    // Populate Private Zones
    await prisma.privateZone.deleteMany({ where: { spaceId: sp.id } });
    await prisma.privateZone.createMany({
      data: [
        { name: 'Meeting Room A', spaceId: sp.id, startX: 4, startY: 4, endX: 11, endY: 12 },
        { name: 'Meeting Room B', spaceId: sp.id, startX: 36, startY: 4, endX: 44, endY: 12 },
        { name: 'Lounge Zone', spaceId: sp.id, startX: 4, startY: 18, endX: 44, endY: 24 },
      ]
    });
    console.log('✅ Updated space with elements and private zones:', sp.name, sp.id);
  }

  console.log('🎉 DB Seeding completed with real Gather.town sprites!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

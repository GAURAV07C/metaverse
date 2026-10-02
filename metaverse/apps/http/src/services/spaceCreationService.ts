import client from "@repo/db/client";

export async function createBlankSpace(input: {
  name: string;
  width: number;
  height: number;
  creatorId: string;
}) {
  return client.space.create({
    data: {
      name: input.name,
      width: input.width,
      height: input.height,
      creatorId: input.creatorId,
    },
  });
}

export async function createSpaceFromMap(input: {
  name: string;
  mapId: string;
  creatorId: string;
}) {
  const map = await client.map.findUnique({
    where: { id: input.mapId },
    select: {
      mapElements: true,
      areas: true,
      width: true,
      height: true,
      thumbnails: true,
    },
  });

  if (!map) return null;

  return client.$transaction(async (tx: any) => {
    const space = await tx.space.create({
      data: {
        name: input.name,
        width: map.width,
        height: map.height,
        thumbnail: map.thumbnails,
        creatorId: input.creatorId,
      },
    });

    await tx.spaceElements.createMany({
      data: map.mapElements.map((element: any) => ({
        spaceId: space.id,
        elementId: element.elementId,
        x: Number(element.x ?? 0),
        y: Number(element.y ?? 0),
      })),
    });

    if (map.areas && map.areas.length > 0) {
      await tx.privateZone.createMany({
        data: map.areas.map((area: any) => ({
          spaceId: space.id,
          name: area.name,
          startX: area.x,
          startY: area.y,
          endX: area.x + area.w,
          endY: area.y + area.h,
          floor: area.floor,
          color: area.color,
          texture: area.texture,
        })),
      });
    }

    return space;
  });
}

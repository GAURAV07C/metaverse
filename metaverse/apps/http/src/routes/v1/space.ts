import { Router } from "express";
import { AddElementSchema,  CreateSpaceSchema, deleteElement, UpdateSpaceSchema } from "../../types/index.js";
import client from "@repo/db/client";
import { userMiddleware } from "../../middleware/user.js";
export const spaceRouter = Router();

function parseDimensions(dimensions: string) {
  const [rawWidth, rawHeight] = dimensions.split("x");
  const width = Number(rawWidth);
  const height = Number(rawHeight);

  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 8 || height < 8 || width > 500 || height > 500) {
    return null;
  }

  return { width, height };
}

spaceRouter.post("/", userMiddleware, async (req, res) => {
  const parsedData = CreateSpaceSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.status(400).json({
      message: "Validation failed",
    });
    return;
  }

  if (!parsedData.data?.mapId) {
    const size = parseDimensions(parsedData.data.dimensions);
    if (!size) {
      res.status(400).json({ message: "Invalid dimensions" });
      return;
    }

    const space = await client.space.create({
      data: {
        name: parsedData.data.name,
        width: size.width,
        height: size.height,
        creatorId: req.userId!,
      },
    });

    res.json({ spaceId: space.id });
    return;
  } else {
    const map = await client.map.findUnique({
      where: {
        id: parsedData.data.mapId,
      },
      select: {
        mapElements: true,
        width: true,
        height: true,
        thumbnails: true,
      },
    });

    if (!map) {
      res.status(400).json({ message: "Map not found" });
      return;
    }

    const space = await client.$transaction(async (tx) => {
      const space = await tx.space.create({
        data: {
          name: parsedData.data.name,
          width: map.width,
          height: map.height,
          thumbnail: map.thumbnails,
          creatorId: req.userId!,
        },
      });
      await tx.spaceElements.createMany({
        data: map.mapElements.map((e) => ({
          spaceId: space.id,
          elementId: e.elementId,
          x: Number(e.x ?? 0),
          y: Number(e.y ?? 0),
        })),
      });
      return space;
    });

    res.json({ spaceId: space.id });
  }
});

spaceRouter.delete("/element", userMiddleware, async (req, res) => {
    const  parseData = deleteElement.safeParse(req.body);
    if(!parseData.success){
        res.status(400).json({message:"Validation failed"})
        return
    }

   const spaceElement =  await client.spaceElements.findUnique({
    where:{
        id:parseData.data.id,
    },
    include: {
        space:true,
    }
   })

   if(!spaceElement?.space.creatorId || spaceElement.space.creatorId !== req.userId){
    res.status(403).json({message:"Unauthorized"})
    return;
   }
  

   await client.spaceElements.delete({
    where: {
        id: parseData.data.id
    }
   })

   return res.json({message:"element deleted"});
});

spaceRouter.put("/:spaceId", userMiddleware, async (req, res) => {
  const parseData = UpdateSpaceSchema.safeParse(req.body);
  if (!parseData.success) {
    res.status(400).json({ message: "validation failed" });
    return;
  }

  const space = await client.space.findUnique({
    where: { id: req.params.spaceId as string },
    select: { creatorId: true, width: true, height: true },
  });

  if (!space) {
    return res.status(400).json({ message: "space not found" });
  }

  if (space.creatorId !== req.userId) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const updateData: any = {};
  if (parseData.data.name) updateData.name = parseData.data.name;
  if (parseData.data.dimensions) {
    const size = parseDimensions(parseData.data.dimensions);
    if (!size) {
      return res.status(400).json({ message: "Invalid dimensions" });
    }

    const placements = await client.spaceElements.findMany({
      where: { spaceId: req.params.spaceId as string },
      select: {
        x: true,
        y: true,
        element: {
          select: { width: true, height: true },
        },
      },
    });

    const elementOutOfBounds = placements.some((placement) =>
      placement.x + placement.element.width > size.width ||
      placement.y + placement.element.height > size.height
    );

    if (elementOutOfBounds) {
      return res.status(400).json({ message: "Existing elements exceed the requested dimensions" });
    }

    updateData.width = size.width;
    updateData.height = size.height;
  }

  if (Object.keys(updateData).length === 0) {
    return res.json({ message: "No updates provided" });
  }

  try {
    await client.space.update({
      where: { id: req.params.spaceId as string },
      data: updateData
    });
    return res.json({ message: "Space updated" });
  } catch (e) {
    return res.status(400).json({ message: "Failed to update space" });
  }
});

spaceRouter.delete("/:spaceId", userMiddleware, async (req, res) => {
  const space = await client.space.findUnique({
    where: {
      id: req.params.spaceId as string,
    },
    select: {
      creatorId: true,
    },
  });

  if (!space) {
    return res.status(400).json({
      message: "space not found",
    });
  }

  if (space.creatorId !== req.userId) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  await client.$transaction(async (tx) => {
    await tx.spaceElements.deleteMany({ where: { spaceId: req.params.spaceId as string } });
    await tx.privateZone.deleteMany({ where: { spaceId: req.params.spaceId as string } });
    await tx.meeting.deleteMany({ where: { spaceId: req.params.spaceId as string } });
    await tx.deskAssignment.deleteMany({ where: { spaceId: req.params.spaceId as string } });
    await tx.inviteLink.deleteMany({ where: { spaceId: req.params.spaceId as string } });
    await tx.smartObject.deleteMany({ where: { spaceId: req.params.spaceId as string } });
    await tx.spaceDraft.deleteMany({ where: { spaceId: req.params.spaceId as string } });
    await tx.spaceSettings.deleteMany({ where: { spaceId: req.params.spaceId as string } });
    await tx.space.delete({
      where: {
        id: req.params.spaceId as string,
      },
    });
  });

  return res.json({ message: "space deleted" });
});
spaceRouter.get("/all", userMiddleware, async (req, res) => {
    const spaces = await client.space.findMany({
        where: {
            creatorId: req.userId
        }
    })

    res.json({
        spaces: spaces.map(s => ({
            id: s.id,
            name: s.name,
            thumbnail: s.thumbnail,
            dimensions: `${s.width}x${s.height}`,
        }))
    })

});

spaceRouter.post("/element", userMiddleware, async (req, res) => {
    const parsedData = AddElementSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.status(400).json({
      message: "Validation failed",
    });
    return;
  }

  const space = await client.space.findUnique({
    where: {
        id: parsedData.data.spaceId,
    }, select : {
        width: true,
        height: true,
        creatorId: true,
    }
  })

  if(!space) {
    return res.status(400).json({ message: "Space not found" });
  }

  if (space.creatorId !== req.userId) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const element = await client.element.findUnique({
    where: { id: parsedData.data.elementId },
    select: { width: true, height: true },
  });

  if (!element) {
    return res.status(400).json({ message: "Element not found" });
  }

  const spaceHeight = space.height ?? 0;
  if (
    parsedData.data.x + element.width > space.width ||
    parsedData.data.y + element.height > spaceHeight
  ) {
    res.status(400).json({ message: "Point is outside of the boundary" });
    return;
  }

  await client.spaceElements.create({
    data:{
        spaceId: parsedData.data.spaceId,
        elementId: parsedData.data.elementId,
        x:parsedData.data.x,
        y:parsedData.data.y
    }
  })


   return res.json({message:"element added"});
});

spaceRouter.get("/:spaceId", userMiddleware, async (req, res) => {
    const space = await client.space.findUnique({
        where:{
            id:req.params.spaceId as string
        },
        include: {
            elements:{
                include:{
                    element:{
                        include: {
                            interactiveObjects: true
                        }
                    },
                }
            },
            privateZones: true,
        }
    })

    if(!space){
        res.status(400).json({message:"space not found"})

        return ;
    }

    res.json({
        id: space.id,
        name: space.name,
        thumbnail: space.thumbnail,
        dimensions: `${space.width}x${space.height}`,
        ownerId: space.creatorId,
        elements: space.elements.map((e: any) => {
            const customData = typeof e.customData === 'string' ? JSON.parse(e.customData) : (e.customData || {});
            return {
                id: e.id,
                element: {
                    id: e.element.id,
                    imageUrl: customData.imageUrl ?? e.element.imageUrl,
                    colorMaskUrl: e.element.colorMaskUrl,
                    width: customData.width ?? e.element.width,
                    height: customData.height ?? e.element.height,
                    static: e.element.static,
                    name: customData.name ?? e.element.name,
                    category: customData.category ?? e.element.category,
                    floor: customData.floor ?? null,
                    wall: customData.wall ?? null,
                    color: customData.color ?? null,
                    interactiveObjects: e.element.interactiveObjects,
                },
                x: e.x,
                y: e.y,
            };
        }),
        privateZones: space.privateZones,
    });
});

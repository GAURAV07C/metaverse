import { Router } from "express";
import { AddElementSchema,  CreateSpaceSchema, deleteElement, UpdateSpaceSchema } from "../../types/index.js";
import client from "@repo/db/client";
import { userMiddleware } from "../../middleware/user.js";
import { canEditSpace } from "../../services/officeAccess.js";
import { createBlankSpace, createSpaceFromMap } from "../../services/spaceCreationService.js";
import { parseDimensions } from "../../services/spaceDimensions.js";
import { presentSpaceDetail, presentSpaceListItem } from "../../services/spacePresenter.js";
export const spaceRouter = Router();

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

    const space = await createBlankSpace({
      name: parsedData.data.name,
      width: size.width,
      height: size.height,
      creatorId: req.userId!,
    });

    res.json({ spaceId: space.id });
    return;
  }

  const space = await createSpaceFromMap({
    name: parsedData.data.name,
    mapId: parsedData.data.mapId,
    creatorId: req.userId!,
  });

  if (!space) {
    res.status(400).json({ message: "Map not found" });
    return;
  }

  res.json({ spaceId: space.id });
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
        space: {
          include: {
            members: { where: { userId: req.userId! }, select: { role: true } },
          },
        },
    }
   })

   if(!spaceElement?.space || !canEditSpace(spaceElement.space, req.userId!)){
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
    select: {
      creatorId: true,
      width: true,
      height: true,
      members: { where: { userId: req.userId! }, select: { role: true } },
    },
  });

  if (!space) {
    return res.status(400).json({ message: "space not found" });
  }

  if (!canEditSpace(space, req.userId!)) {
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

    const elementOutOfBounds = placements.some((placement: any) =>
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
      members: { where: { userId: req.userId! }, select: { role: true } },
    },
  });

  if (!space) {
    return res.status(400).json({
      message: "space not found",
    });
  }

  if (!canEditSpace(space, req.userId!)) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  try {
    await client.$transaction(async (tx: any) => {
      await tx.spaceElements.deleteMany({ where: { spaceId: req.params.spaceId as string } });
      await tx.privateZone.deleteMany({ where: { spaceId: req.params.spaceId as string } });
      await tx.meeting.deleteMany({ where: { spaceId: req.params.spaceId as string } });
      // The following have onDelete: Cascade in the DB schema, so Prisma/Postgres handles them automatically when space is deleted.
      // Doing deleteMany on 1-to-1 relations like spaceDraft or spaceSettings can cause Prisma errors.
      await tx.space.delete({
        where: {
          id: req.params.spaceId as string,
        },
      });
    });
  } catch (error) {
    console.error("Failed to delete space", error);
    return res.status(500).json({ message: "Failed to delete space", error: String(error) });
  }

  return res.json({ message: "space deleted" });
});
spaceRouter.get("/all", userMiddleware, async (req, res) => {
    const spaces = await client.space.findMany({
        where: {
            OR: [
              { creatorId: req.userId },
              { members: { some: { userId: req.userId! } } },
            ],
        },
        include: {
          members: { where: { userId: req.userId! }, select: { role: true } },
        },
    })

    res.json({
        spaces: spaces.map((space: any) => presentSpaceListItem(space, req.userId!))
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
        members: { where: { userId: req.userId! }, select: { role: true } },
    }
  })

  if(!space) {
    return res.status(400).json({ message: "Space not found" });
  }

  if (!canEditSpace(space, req.userId!)) {
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
        y:parsedData.data.y,
        rotation: parsedData.data.rotation || 0,
        color: parsedData.data.color || null,
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
            studioDraft: true,
            members: {
                where: { userId: req.userId! },
                select: { role: true },
            },
        }
    })

    if(!space){
        res.status(400).json({message:"space not found"})

        return ;
    }

    res.json(presentSpaceDetail(space, req.userId!));
});

import { Router } from "express";
import { adminMiddleware } from "../../middleware/admin.js";
import {
  CreateAvatarSchema,
  CreateElementSchema,
  CreateMapSchema,
  UpdateElementSchema,
  UpdateMapSchema,
} from "../../types/index.js";
import client from "@repo/db/client";

export const adminRouter = Router();

adminRouter.post("/element", adminMiddleware, async (req, res) => {
  const parseData = CreateElementSchema.safeParse(req.body);

  if (!parseData.success) {
    res.status(400).json({ message: "validation failed" });
    return;
  }
  const createData: any = {
    width: parseData.data.width,
    height: parseData.data.height,
    static: parseData.data.static,
    imageUrl: parseData.data.imageUrl,
  };
  if (parseData.data.name) createData.name = parseData.data.name;
  if (parseData.data.category) createData.category = parseData.data.category;
  if (parseData.data.colorMaskUrl) createData.colorMaskUrl = parseData.data.colorMaskUrl;
  if (parseData.data.variants) createData.variants = parseData.data.variants;

  const element = await client.element.create({
    data: createData,
  });

  return res.json({
    id: element.id,
  });
});

adminRouter.put("/element/:elementId", adminMiddleware, async (req, res) => {
  const parseData = UpdateElementSchema.safeParse(req.body);

  if (!parseData.success) {
    res.status(400).json({ message: "validation failed" });
    return;
  }

  const updateData: any = {};
  if (parseData.data.imageUrl !== undefined) updateData.imageUrl = parseData.data.imageUrl;
  if (parseData.data.width !== undefined) updateData.width = parseData.data.width;
  if (parseData.data.height !== undefined) updateData.height = parseData.data.height;
  if (parseData.data.static !== undefined) updateData.static = parseData.data.static;
  if (parseData.data.name !== undefined) updateData.name = parseData.data.name;
  if (parseData.data.category !== undefined) updateData.category = parseData.data.category;
  if (parseData.data.colorMaskUrl !== undefined) updateData.colorMaskUrl = parseData.data.colorMaskUrl;
  if (parseData.data.variants !== undefined) updateData.variants = parseData.data.variants;

  await client.element.update({
    where: {
      id: req.params.elementId! as string,
    },
    data: updateData,
  });

  return res.json({
    message: "element updated",
  });
});

adminRouter.post("/avatar", adminMiddleware, async (req, res) => {
  const parseData = CreateAvatarSchema.safeParse(req.body);

  if (!parseData.success) {
    res.status(400).json({ message: "validation failed" });
    return;
  }

  const avatar = await client.avatar.create({
    data: {
      name: parseData.data.name,
      imageUrl: parseData.data.imageUrl,
    },
  });

  return res.json({ id: avatar.id });
});

adminRouter.post("/map", adminMiddleware, async (req, res) => {
  const parseData = CreateMapSchema.safeParse(req.body);

  if (!parseData.success) {
    res.status(400).json({ message: "validation failed" });
    return;
  }

  const mapData: any = {
    name: parseData.data.name as string,
    type: parseData.data.type || "map",
    width: parseInt(parseData.data.dimensions.split("x")[0]!),
    height: parseInt(parseData.data.dimensions.split("x")[1]!),
    thumbnails: parseData.data.thumbnail,
    mapElements: {
      create: parseData.data.defaultElements.map((e) => ({
        elementId: e.elementId,
        x: e.x,
        y: e.y,
        rotation: e.rotation || 0,
        color: e.color || null,
      })),
    },
  };

  if (parseData.data.areas && parseData.data.areas.length > 0) {
    mapData.areas = {
      create: parseData.data.areas.map((a) => ({
        name: a.name,
        x: a.x, y: a.y, w: a.w, h: a.h,
        floor: a.floor, color: a.color, texture: a.texture
      }))
    };
  }

  const map = await client.map.create({
    data: mapData,
  });

  return res.json({
    id: map.id,
  });
});

adminRouter.put("/map/:mapId", adminMiddleware, async (req, res) => {
  const parseData = UpdateMapSchema.safeParse(req.body);
  if (!parseData.success) {
    res.status(400).json({ message: "validation failed" });
    return;
  }
  
  const updateData: any = {};
  if (parseData.data.name) updateData.name = parseData.data.name;
  if (parseData.data.type) updateData.type = parseData.data.type;
  if (parseData.data.thumbnail) updateData.thumbnails = parseData.data.thumbnail;
  
  try {
    await client.map.update({
      where: { id: req.params.mapId as string },
      data: updateData
    });

    if (parseData.data.defaultElements !== undefined) {
      await client.mapElements.deleteMany({
        where: { mapId: req.params.mapId as string },
      });
      if (parseData.data.defaultElements.length > 0) {
        await client.mapElements.createMany({
          data: parseData.data.defaultElements.map((e) => ({
            mapId: req.params.mapId as string,
            elementId: e.elementId,
            x: e.x,
            y: e.y,
            rotation: e.rotation || 0,
            color: e.color || null,
          })),
        });
      }
    }

    if (parseData.data.areas !== undefined) {
      await client.mapArea.deleteMany({
        where: { mapId: req.params.mapId as string },
      });
      if (parseData.data.areas.length > 0) {
        await client.mapArea.createMany({
          data: parseData.data.areas.map((a) => ({
            mapId: req.params.mapId as string,
            name: a.name,
            x: a.x, y: a.y, w: a.w, h: a.h,
            floor: a.floor, color: a.color, texture: a.texture
          })),
        });
      }
    }

    return res.json({ message: "Map updated" });
  } catch (e) {
    return res.status(400).json({ message: "Failed to update map" });
  }
});

adminRouter.delete("/element/:elementId", adminMiddleware, async (req, res) => {
  try {
    await client.spaceElements.deleteMany({
      where: { elementId: req.params.elementId as string },
    });
    await client.mapElements.deleteMany({
      where: { elementId: req.params.elementId as string },
    });
    await client.element.delete({
      where: { id: req.params.elementId as string },
    });
    return res.json({ message: "Element deleted" });
  } catch (e) {
    return res.status(400).json({ message: "Failed to delete element, it may be in use." });
  }
});

adminRouter.delete("/avatar/:avatarId", adminMiddleware, async (req, res) => {
  try {
    await client.avatar.delete({
      where: { id: req.params.avatarId as string },
    });
    return res.json({ message: "Avatar deleted" });
  } catch (e) {
    return res.status(400).json({ message: "Failed to delete avatar, it may be in use." });
  }
});

adminRouter.delete("/map/:mapId", adminMiddleware, async (req, res) => {
  try {
    // Delete mapElements first because of relation
    await client.mapElements.deleteMany({
      where: { mapId: req.params.mapId as string }
    });
    await client.map.delete({
      where: { id: req.params.mapId as string },
    });
    return res.json({ message: "Map deleted" });
  } catch (e) {
    return res.status(400).json({ message: "Failed to delete map." });
  }
});

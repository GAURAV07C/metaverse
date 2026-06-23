import { Router } from "express";
import { adminMiddleware } from "../../middleware/admin.js";
import {
  CreateAvatarSchema,
  CreateElementSchema,
  CreateMapSchema,
  UpdateElementSchema,
} from "../../types/index.js";
import client from "@repo/db/client";

export const adminRouter = Router();

adminRouter.post("/element", adminMiddleware, async (req, res) => {
  const parseData = CreateElementSchema.safeParse(req.body);

  if (!parseData.success) {
    res.status(400).json({ message: "validation failed" });
    return;
  }
  const element = await client.element.create({
    data: {
      width: parseData.data.width,
      height: parseData.data.height,
      static: parseData.data.static,
      imageUrl: parseData.data.imageUrl,
    },
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

  await client.element.update({
    where: {
      id: req.params.elementId! as string,
    },
    data: {
      imageUrl: parseData.data.imageUrl,
    },
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

  const map = await client.map.create({
    data: {
      name: parseData.data.name as string,
      width: parseInt(parseData.data.dimensions.split("x")[0]!),
      height: parseInt(parseData.data.dimensions.split("x")[1]!),
      thumbnails: parseData.data.thumbnail,
      mapElements: {
        create: parseData.data.defaultElements.map((e) => ({
          elementId: e.elementId,
          x: e.x,
          y: e.y,
        })),
      },
    },
  });

  return res.json({
    id: map.id,
  });
});

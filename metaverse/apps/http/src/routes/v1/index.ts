import { Router } from "express";
import { userRouter } from "./user.js";
import { adminRouter } from "./admin.js";
import { spaceRouter } from "./space.js";
import { SigninSchema, SignupSchema } from "../../types/index.js";
import bcrypt from "bcrypt";
import { client } from "@repo/db/client";
import { organizationRouter } from "./organization.js";
import { officeRouter } from "./office.js";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../../config.js";

export const router = Router();

router.post("/signup", async (req, res) => {
  const parseData = SignupSchema.safeParse(req.body);

  if (!parseData.success) {
    return res.status(400).json({ message: "Validation failed" });
  }
  const hashpassword = await bcrypt.hash(parseData.data.password, 10);

  try {
    const existingUser = await client.user.findFirst({
      where: {
        username: parseData.data.username,
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await client.user.create({
      data: {
        username: parseData.data.username,
        password: hashpassword,
        role: parseData.data.type === "admin" ? "Admin" : "User",
      },
    });

    res.json({
      userId: user.id,
    });
  } catch (e) {
    res.status(500).json({ message: "Internal server error", e });
  }
});

router.post("/signin", async (req, res) => {
  const parsedData = SigninSchema.safeParse(req.body);
  if (!parsedData.success) {
    return res.status(403).json({ message: "validation failed" });
  }

  try {
    const user = await client.user.findFirst({
      where: {
        username: parsedData.data.username,
      },
    });

    if (!user) {
      res.status(403).json({
        message: "User not found",
      });

      return;
    }

    const isValid = await bcrypt.compare(
      parsedData.data.password,
      user.password,
    );

    if (!isValid) {
      res.status(403).json({
        message: "Invalid password",
      });

      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      JWT_PASSWORD,
    );

    return res.json({
      token,
      userId: user.id,
      username: user.username,
      type: user.role === "Admin" ? "admin" : "user",
    });
  } catch (e) {
    res.status(500).json({ message: "Internal server error" });
  }
});

interface elementTypes {
  id: string;
  imageUrl: string;
  colorMaskUrl: string | null;
  width: number;
  height: number;
  static: boolean;
  name: string | null;
  category: string | null;
}

router.get("/elements", async (req, res) => {
  const elements = await client.element.findMany();

  return res.json({
    element: elements.map((e: elementTypes) => ({
      id: e.id,
      imageUrl: e.imageUrl,
      colorMaskUrl: e.colorMaskUrl,
      width: e.width,
      height: e.height,
      static: e.static,
      name: e.name,
      category: e.category,
    })),
  });
});

interface avtarTypes {
  id: string;
  imageUrl: string | null;
  name: string | null;
}

router.get("/avatars", async (req, res) => {
  const avatars = await client.avatar.findMany();
  return res.json({
    avatars: avatars.map((e: avtarTypes) => ({
      id: e.id,
      imageUrl: e.imageUrl,
      name: e.name,
    })),
  });
});

router.get("/maps", async (req, res) => {
  const maps = await client.map.findMany({
    include: {
      mapElements: {
        include: { element: true },
      },
      areas: true,
    },
  });
  return res.json({
    maps: maps.map((m: any) => ({
      id: m.id,
      name: m.name,
      type: (m as any).type || "map",
      dimensions: `${m.width}x${m.height}`,
      thumbnail: m.thumbnails,
      elementCount: m.mapElements.length,
      elements: m.mapElements.map((me: any) => ({
        id: me.id,
        x: me.x,
        y: me.y,
        element: {
          id: me.element.id,
          imageUrl: me.element.imageUrl,
          width: me.element.width,
          height: me.element.height,
          static: me.element.static,
        },
      })),
      areas:
        (m as any).areas?.map((a: any) => ({
          id: a.id,
          name: a.name,
          x: a.x,
          y: a.y,
          w: a.w,
          h: a.h,
          floor: a.floor,
          color: a.color,
          texture: a.texture,
        })) || [],
    })),
  });
});

router.use("/user", userRouter);
router.use("/admin", adminRouter);
router.use("/space", spaceRouter);
router.use("/organization", organizationRouter);
router.use("/office", officeRouter);

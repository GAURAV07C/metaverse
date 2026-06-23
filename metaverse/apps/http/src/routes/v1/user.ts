import { Router } from "express";
import { UpdatedMetaVerseSchema } from "../../types/index.js";
import client from "@repo/db/client";
import { userMiddleware } from "../../middleware/user.js";

export const userRouter = Router();

userRouter.post("/metadata", userMiddleware, async (req, res) => {
  const parsedData = UpdatedMetaVerseSchema.safeParse(req.body);
  if (!parsedData.success) {
    return res.status(400).json({ error: parsedData.error.message });
  }

  const avatar = await client.avatar.findUnique({
    where: { id: parsedData.data.avatarId },
  });

  if (!avatar) {
    return res.status(403).json({ error: "Invalid avatar id" });
  }

  await client.user.update({
    where: {
      id: req.userId,
    },
    data: {
      avatarId: parsedData.data.avatarId,
    },
  });

  res.json({
    message: "Metadata updated",
  });
});

userRouter.get("/metadata/bulk", async (req, res) => {
  const userIdString = (req.query.ids ?? "[]") as string;
  const userIds = userIdString.slice(1, -1).split(",");

  const metadata = await client.user.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
    select: {
      avatar: true,
      id: true,
    },
  });

  res.json({
    avatars: metadata.map((m) => ({
      userId: m.id,
      avatarId: m.avatar?.imageUrl,
    })),
  });
});

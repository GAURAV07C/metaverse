import { Router } from "express";
import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import client from "@repo/db/client";
import { userMiddleware } from "../../middleware/user.js";
import { DeskAssignmentSchema, OfficeSettingsSchema, SpaceDraftSchema } from "../../types/index.js";

export const officeRouter = Router();
officeRouter.use(userMiddleware);

async function getSpaceForUser(spaceId: string, userId: string) {
  return client.space.findUnique({ where: { id: spaceId }, select: { id: true, name: true, width: true, height: true, creatorId: true } });
}

function getSpaceRole(space: { creatorId: string }, userId: string) {
  return space.creatorId === userId ? "Owner" : "Guest";
}

function canEditSpace(space: { creatorId: string }, userId: string) {
  return getSpaceRole(space, userId) === "Owner";
}

function requireSpaceEditor(space: { creatorId: string }, userId: string, res: any) {
  if (canEditSpace(space, userId)) return true;
  res.status(403).json({ message: "Only the space owner can edit this office" });
  return false;
}

function publicSettings(settings: any) {
  if (!settings) return null;
  const { id, spaceId, createdAt, updatedAt, ...rest } = settings;
  return { id, spaceId, ...rest, createdAt, updatedAt };
}

function validatePortalTargets(data: any, width: number, height: number) {
  const areas = Array.isArray(data?.areas) ? data.areas : [];
  const roomIds = new Set(
    areas
      .filter((area: any) => area?.id && (area.type === "room" || area.type === "private"))
      .map((area: any) => area.id)
  );
  for (const area of areas) {
    if (area?.type !== "portal") continue;
    const label = area.name || "Portal";
    const hasX = area.targetX !== undefined && area.targetX !== null && area.targetX !== "";
    const hasY = area.targetY !== undefined && area.targetY !== null && area.targetY !== "";
    if (hasX !== hasY) return `${label}: target X and Y both are required`;
    if (hasX && hasY) {
      if (!Number.isInteger(area.targetX) || !Number.isInteger(area.targetY)) return `${label}: target coordinates must be integers`;
      if (!area.targetSpaceId && (area.targetX < 0 || area.targetX >= width || area.targetY < 0 || area.targetY >= height)) {
        return `${label}: target coordinates must stay inside the map`;
      }
    }
    if (typeof area.targetUrl === "string" && area.targetUrl.trim()) {
      const url = area.targetUrl.trim();
      if (!url.startsWith("/") && !/^https?:\/\//i.test(url)) return `${label}: target URL must start with / or http(s)`;
    }
    if (area.targetRoomId && !area.targetSpaceId && !roomIds.has(area.targetRoomId)) {
      return `${label}: target room does not exist in this map`;
    }
  }
  return "";
}

officeRouter.get("/:spaceId/settings", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });

  const settings = await client.spaceSettings.upsert({
    where: { spaceId: space.id },
    update: {},
    create: { spaceId: space.id },
  });
  res.json({ space, settings: publicSettings(settings) });
});

officeRouter.put("/:spaceId/settings", async (req, res) => {
  const parsed = OfficeSettingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Validation failed" });

  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceEditor(space, req.userId, res)) return;

  const settingsData = Object.fromEntries(Object.entries(parsed.data).filter(([, value]) => value !== undefined));
  const settings = await client.spaceSettings.upsert({
    where: { spaceId: space.id },
    update: settingsData,
    create: { spaceId: space.id, ...settingsData },
  });
  res.json({ settings: publicSettings(settings) });
});

officeRouter.get("/:spaceId/invites", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceEditor(space, req.userId, res)) return;
  const invites = await client.inviteLink.findMany({ where: { spaceId: space.id }, orderBy: { createdAt: "desc" } });
  res.json({ invites });
});

officeRouter.post("/:spaceId/invites", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceEditor(space, req.userId, res)) return;
  const token = crypto.randomBytes(18).toString("base64url");
  const invite = await client.inviteLink.create({
    data: {
      spaceId: space.id,
      token,
      role: typeof req.body?.role === "string" ? req.body.role.slice(0, 32) : "Member",
      expiresAt: req.body?.expiresAt ? new Date(req.body.expiresAt) : null,
    },
  });
  res.json({ invite, url: `/space/${space.id}/join?invite=${token}` });
});

officeRouter.get("/:spaceId/invite-events", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  const take = Math.min(Math.max(Number(req.query.take) || 50, 1), 100);
  const where = canEditSpace(space, req.userId)
    ? { spaceId: space.id }
    : {
        spaceId: space.id,
        OR: [
          { fromUserId: req.userId },
          { toUserId: req.userId },
        ],
      };
  const events = await (client as any).roomInviteEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
  });
  res.json({ events });
});

officeRouter.get("/:spaceId/moderation-audit", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceEditor(space, req.userId, res)) return;
  const take = Math.min(Math.max(Number(req.query.take) || 50, 1), 100);
  const events = await (client as any).moderationAuditEvent.findMany({
    where: { spaceId: space.id },
    orderBy: { createdAt: "desc" },
    take,
  });
  res.json({ events });
});

officeRouter.get("/:spaceId/desks", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  const desks = await client.deskAssignment.findMany({ where: { spaceId: space.id }, include: { user: { select: { id: true, username: true, avatar: true } } } });
  res.json({ desks });
});

officeRouter.post("/:spaceId/desks", async (req, res) => {
  const parsed = DeskAssignmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Validation failed" });

  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceEditor(space, req.userId, res)) return;
  if (parsed.data.x < 0 || parsed.data.y < 0 || parsed.data.x >= space.width || parsed.data.y >= (space.height ?? 0)) {
    return res.status(400).json({ message: "Desk is outside the office" });
  }

  const deskData = Object.fromEntries(Object.entries(parsed.data).filter(([, value]) => value !== undefined));
  const desk = await client.deskAssignment.create({ data: { spaceId: space.id, ...deskData } as any });
  res.json({ desk });
});

officeRouter.put("/:spaceId/desks/:deskId", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceEditor(space, req.userId, res)) return;
  try {
    let dataToUpdate = { ...req.body };
    
    // If username is provided, lookup the user ID
    if (dataToUpdate.username) {
      const user = await client.user.findUnique({ where: { username: dataToUpdate.username } });
      if (!user) return res.status(404).json({ message: "User not found with that username" });
      dataToUpdate.userId = user.id;
      delete dataToUpdate.username;
    } else if (dataToUpdate.username === "") {
      dataToUpdate.userId = null;
      delete dataToUpdate.username;
    }

    const updated = await client.deskAssignment.update({
      where: { id: req.params.deskId, spaceId: space.id },
      data: dataToUpdate,
    });
    res.json({ desk: updated });
  } catch(e) {
    res.status(400).json({ message: "Failed to update desk" });
  }
});

officeRouter.delete("/:spaceId/desks/:deskId", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceEditor(space, req.userId, res)) return;
  try {
    await client.deskAssignment.delete({
      where: { id: req.params.deskId, spaceId: space.id },
    });
    res.json({ success: true });
  } catch(e) {
    res.status(400).json({ message: "Failed to delete desk" });
  }
});

officeRouter.get("/:spaceId/draft", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceEditor(space, req.userId, res)) return;
  const draft = await client.spaceDraft.findUnique({ where: { spaceId: space.id } });
  res.json({ draft: draft ?? null });
});

officeRouter.put("/:spaceId/draft", async (req, res) => {
  const parsed = SpaceDraftSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Validation failed" });

  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceEditor(space, req.userId, res)) return;
  const draft = await client.spaceDraft.upsert({
    where: { spaceId: space.id },
    update: { data: parsed.data.data as Prisma.InputJsonValue, updatedById: req.userId },
    create: { spaceId: space.id, data: parsed.data.data as Prisma.InputJsonValue, updatedById: req.userId },
  });
  res.json({ draft });
});

officeRouter.post("/:spaceId/publish", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceEditor(space, req.userId, res)) return;

  const draft = await client.spaceDraft.findUnique({ where: { spaceId: space.id } });
  if (!draft || !draft.data) {
    return res.status(400).json({ message: "Nothing to publish" });
  }

  const data = draft.data as any;
  const portalTargetError = validatePortalTargets(data, space.width, space.height || space.width);
  if (portalTargetError) {
    return res.status(400).json({ message: portalTargetError });
  }

  if (data.elements && Array.isArray(data.elements)) {
    // Fetch all existing element IDs in database
    const dbElements = await client.element.findMany({ select: { id: true } });
    const validElementIds = new Set(dbElements.map(e => e.id));
    const fallbackElementId = dbElements[0]?.id;

    // Delete all existing spaceElements for this space
    await client.spaceElements.deleteMany({ where: { spaceId: space.id } });

    // Insert all draft elements safely
    const elementsToInsert = data.elements
      .filter((e: any) => e.element)
      .map((e: any) => {
        const targetElementId = validElementIds.has(e.element.id) ? e.element.id : fallbackElementId;
        if (!targetElementId) return null;

        return {
          spaceId: space.id,
          elementId: targetElementId,
          x: e.x,
          y: e.y,
          customData: {
            width: e.element.width,
            height: e.element.height,
            color: e.element.color,
            floor: e.element.floor,
            wall: e.element.wall,
            name: e.element.name,
            category: e.element.category,
            imageUrl: e.element.imageUrl,
            colorMaskUrl: e.element.colorMaskUrl,
            interactiveObjects: Array.isArray(e.element.interactiveObjects) ? e.element.interactiveObjects : undefined
          }
        };
      })
      .filter((e: any): e is NonNullable<typeof e> => e !== null);

    if (elementsToInsert.length > 0) {
      await client.spaceElements.createMany({
        data: elementsToInsert
      });
    }
  }

  // Also sync areas to PrivateZone
  if (data.areas && Array.isArray(data.areas)) {
    await client.privateZone.deleteMany({ where: { spaceId: space.id } });
    
    const areasToInsert = data.areas.map((a: any) => ({
      id: typeof a.id === 'string' && a.id ? a.id : undefined,
      spaceId: space.id,
      name: a.name || 'Area',
      type: a.type === 'private' ? 'room' : (a.type || 'public'),
      startX: a.x,
      startY: a.y,
      endX: a.x + a.w,
      endY: a.y + a.h,
      floor: a.floor,
      color: a.color,
      texture: a.texture,
    }));

    if (areasToInsert.length > 0) {
      await client.privateZone.createMany({
        data: areasToInsert
      });
    }
  }

  const updatedDraft = await client.spaceDraft.update({ where: { spaceId: space.id }, data: { publishedAt: new Date() } }).catch(() => null);
  res.json({ message: "Office draft published", draft: updatedDraft });
});

import { Router } from "express";
import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import client from "@repo/db/client";
import { userMiddleware } from "../../middleware/user.js";
import { DeskAssignmentSchema, OfficeSettingsSchema, SpaceDraftSchema } from "../../types/index.js";

export const officeRouter = Router();
officeRouter.use(userMiddleware);

const SPACE_MEMBER_ROLES = ["Admin", "Builder", "Member", "Guest"] as const;
const EDITOR_ROLES = new Set(["Owner", "Admin", "Builder"]);
const MANAGER_ROLES = new Set(["Owner", "Admin"]);

function cleanSpaceRole(role: any) {
  return SPACE_MEMBER_ROLES.includes(role) ? role : "Member";
}

async function getSpaceForUser(spaceId: string, userId: string) {
  return client.space.findUnique({
    where: { id: spaceId },
    select: {
      id: true,
      name: true,
      width: true,
      height: true,
      creatorId: true,
      members: { where: { userId }, select: { role: true } },
    },
  });
}

function getSpaceRole(space: { creatorId: string; members?: { role: string }[] }, userId: string) {
  if (space.creatorId === userId) return "Owner";
  return cleanSpaceRole(space.members?.[0]?.role || "Guest");
}

function canEditSpace(space: { creatorId: string; members?: { role: string }[] }, userId: string) {
  return EDITOR_ROLES.has(getSpaceRole(space, userId));
}

function canManageMembers(space: { creatorId: string; members?: { role: string }[] }, userId: string) {
  return MANAGER_ROLES.has(getSpaceRole(space, userId));
}

function requireSpaceEditor(space: { creatorId: string; members?: { role: string }[] }, userId: string, res: any) {
  if (canEditSpace(space, userId)) return true;
  res.status(403).json({ message: "Only owners, admins, and builders can edit this office" });
  return false;
}

function requireSpaceManager(space: { creatorId: string; members?: { role: string }[] }, userId: string, res: any) {
  if (canManageMembers(space, userId)) return true;
  res.status(403).json({ message: "Only owners and admins can manage members" });
  return false;
}

function publicSettings(settings: any) {
  if (!settings) return null;
  const { id, spaceId, createdAt, updatedAt, ...rest } = settings;
  return { id, spaceId, ...rest, createdAt, updatedAt };
}

const defaultNotificationPreferences = {
  joins: true,
  chat: true,
  roomInvites: true,
  sounds: true,
  reconnecting: true,
  respectFocus: true,
};

function cleanNotificationPreferences(body: any) {
  return Object.fromEntries(
    Object.keys(defaultNotificationPreferences)
      .filter((key) => typeof body?.[key] === "boolean")
      .map((key) => [key, body[key]])
  );
}

function publicNotificationPreferences(preferences: any) {
  if (!preferences) return defaultNotificationPreferences;
  const { id, spaceId, userId, createdAt, updatedAt, ...rest } = preferences;
  return { ...defaultNotificationPreferences, ...rest };
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

officeRouter.get("/:spaceId/notification-preferences", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  const preferences = await (client as any).notificationPreference.findUnique({
    where: { spaceId_userId: { spaceId: space.id, userId: req.userId } },
  });
  res.json({ preferences: publicNotificationPreferences(preferences) });
});

officeRouter.put("/:spaceId/notification-preferences", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  const data = cleanNotificationPreferences(req.body);
  const preferences = await (client as any).notificationPreference.upsert({
    where: { spaceId_userId: { spaceId: space.id, userId: req.userId } },
    update: data,
    create: { spaceId: space.id, userId: req.userId, ...defaultNotificationPreferences, ...data },
  });
  res.json({ preferences: publicNotificationPreferences(preferences) });
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
      role: cleanSpaceRole(req.body?.role),
      expiresAt: req.body?.expiresAt ? new Date(req.body.expiresAt) : null,
    },
  });
  res.json({ invite, url: `/space/${space.id}/join?invite=${token}` });
});

officeRouter.get("/:spaceId/members", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceManager(space, req.userId, res)) return;

  const [owner, members] = await Promise.all([
    client.user.findUnique({ where: { id: space.creatorId }, select: { id: true, username: true, avatar: true } }),
    (client as any).spaceMember.findMany({
      where: { spaceId: space.id },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      include: { user: { select: { id: true, username: true, avatar: true } } },
    }),
  ]);

  res.json({
    members: [
      {
        id: "owner",
        userId: space.creatorId,
        username: owner?.username || "Owner",
        avatar: owner?.avatar || null,
        role: "Owner",
        createdAt: null,
        updatedAt: null,
      },
      ...members
        .filter((member: any) => member.userId !== space.creatorId)
        .map((member: any) => ({
          id: member.id,
          userId: member.userId,
          username: member.user?.username || "Unknown",
          avatar: member.user?.avatar || null,
          role: cleanSpaceRole(member.role),
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
        })),
    ],
  });
});

officeRouter.post("/:spaceId/members", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceManager(space, req.userId, res)) return;

  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  if (!username) return res.status(400).json({ message: "Username is required" });

  const user = await client.user.findUnique({ where: { username }, select: { id: true, username: true, avatar: true } });
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.id === space.creatorId) return res.status(400).json({ message: "Owner already has full access" });

  const role = cleanSpaceRole(req.body?.role);
  const member = await (client as any).spaceMember.upsert({
    where: { spaceId_userId: { spaceId: space.id, userId: user.id } },
    update: { role },
    create: { spaceId: space.id, userId: user.id, role, createdById: req.userId },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  });

  res.json({
    member: {
      id: member.id,
      userId: member.userId,
      username: member.user?.username || "Unknown",
      avatar: member.user?.avatar || null,
      role: cleanSpaceRole(member.role),
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    },
  });
});

officeRouter.put("/:spaceId/members/:userId", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceManager(space, req.userId, res)) return;
  if (req.params.userId === space.creatorId) return res.status(400).json({ message: "Owner role cannot be changed" });

  const user = await client.user.findUnique({ where: { id: req.params.userId }, select: { id: true, username: true, avatar: true } });
  if (!user) return res.status(404).json({ message: "User not found" });

  const role = cleanSpaceRole(req.body?.role);
  const member = await (client as any).spaceMember.upsert({
    where: { spaceId_userId: { spaceId: space.id, userId: user.id } },
    update: { role },
    create: { spaceId: space.id, userId: user.id, role, createdById: req.userId },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  });

  res.json({
    member: {
      id: member.id,
      userId: member.userId,
      username: member.user?.username || "Unknown",
      avatar: member.user?.avatar || null,
      role: cleanSpaceRole(member.role),
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    },
  });
});

officeRouter.delete("/:spaceId/members/:userId", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceManager(space, req.userId, res)) return;
  if (req.params.userId === space.creatorId) return res.status(400).json({ message: "Owner cannot be removed" });

  await (client as any).spaceMember.deleteMany({
    where: { spaceId: space.id, userId: req.params.userId },
  });
  res.json({ success: true });
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
    update: { data: parsed.data.data as any, updatedById: req.userId },
    create: { spaceId: space.id, data: parsed.data.data as any, updatedById: req.userId },
  });
  res.json({ draft });
});

officeRouter.get("/:spaceId/versions", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceEditor(space, req.userId, res)) return;
  const versions = await (client as any).spaceMapVersion.findMany({
    where: { spaceId: space.id },
    orderBy: { version: "desc" },
    take: 30,
    include: { createdBy: { select: { username: true } } },
  });
  res.json({
    versions: versions.map((version: any) => {
      const data = version.data || {};
      return {
        id: version.id,
        version: version.version,
        createdAt: version.createdAt,
        createdByUsername: version.createdBy?.username || null,
        elementCount: Array.isArray(data.elements) ? data.elements.length : 0,
        areaCount: Array.isArray(data.areas) ? data.areas.length : 0,
      };
    }),
  });
});

officeRouter.post("/:spaceId/versions/:versionId/restore", async (req, res) => {
  const space = await getSpaceForUser(req.params.spaceId, req.userId);
  if (!space) return res.status(404).json({ message: "Space not found" });
  if (!requireSpaceEditor(space, req.userId, res)) return;

  const version = await (client as any).spaceMapVersion.findFirst({
    where: { id: req.params.versionId, spaceId: space.id },
  });
  if (!version) return res.status(404).json({ message: "Version not found" });

  const draft = await client.spaceDraft.upsert({
    where: { spaceId: space.id },
    update: { data: version.data as any, updatedById: req.userId },
    create: { spaceId: space.id, data: version.data as any, updatedById: req.userId },
  });

  res.json({ draft, restoredVersion: version.version });
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
    const validElementIds = new Set(dbElements.map((e: any) => e.id));
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
    
    let defaultSpawnConsumed = false;
    const areasToInsert = data.areas.map((a: any) => {
      const isDefaultSpawn = a.type === 'spawn' && Boolean(a.isDefaultSpawn) && !defaultSpawnConsumed;
      if (isDefaultSpawn) defaultSpawnConsumed = true;
      return ({
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
      isDefaultSpawn,
      targetUrl: a.type === 'portal' && typeof a.targetUrl === 'string' && a.targetUrl.trim() ? a.targetUrl.trim() : undefined,
      targetSpaceId: a.type === 'portal' && typeof a.targetSpaceId === 'string' && a.targetSpaceId.trim() ? a.targetSpaceId.trim() : undefined,
      targetRoomId: a.type === 'portal' && typeof a.targetRoomId === 'string' && a.targetRoomId.trim() ? a.targetRoomId.trim() : undefined,
      targetX: a.type === 'portal' && Number.isInteger(a.targetX) ? a.targetX : undefined,
      targetY: a.type === 'portal' && Number.isInteger(a.targetY) ? a.targetY : undefined,
    });
    });

    if (areasToInsert.length > 0) {
      await client.privateZone.createMany({
        data: areasToInsert
      });
    }
  }

  const latestVersion = await (client as any).spaceMapVersion.findFirst({
    where: { spaceId: space.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latestVersion?.version || 0) + 1;
  await (client as any).spaceMapVersion.create({
    data: {
      spaceId: space.id,
      version: nextVersion,
      data: data as any,
      createdById: req.userId,
    },
  });

  const updatedDraft = await client.spaceDraft.update({ where: { spaceId: space.id }, data: { publishedAt: new Date() } }).catch(() => null);
  res.json({ message: "Office draft published", draft: updatedDraft });
});

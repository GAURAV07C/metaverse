import { Router } from "express";
import crypto from "node:crypto";
import client from "@repo/db/client";
import { userMiddleware } from "../../middleware/user.js";
import { DeskAssignmentSchema, OfficeSettingsSchema, SpaceDraftSchema } from "../../types/index.js";
import {
  canEditSpace,
  cleanSpaceRole,
  getSpaceForUser,
  requireSpaceEditor,
  requireSpaceManager,
} from "../../services/officeAccess.js";
import {
  cleanNotificationPreferences,
  defaultNotificationPreferences,
  publicNotificationPreferences,
  publicSettings,
} from "../../services/officePreferences.js";
import { PublishValidationError, publishOfficeDraft } from "../../services/officePublishService.js";

export const officeRouter = Router();
officeRouter.use(userMiddleware);

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

  try {
    const updatedDraft = await publishOfficeDraft(space, draft, req.userId);
    res.json({ message: "Office draft published", draft: updatedDraft });
  } catch (error) {
    if (error instanceof PublishValidationError) {
      return res.status(400).json({ message: error.message });
    }
    throw error;
  }
});

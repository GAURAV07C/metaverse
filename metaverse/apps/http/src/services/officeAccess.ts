import type { Response } from "express";
import client from "@repo/db/client";

export const SPACE_MEMBER_ROLES = ["Admin", "Builder", "Member", "Guest"] as const;
const EDITOR_ROLES = new Set(["Owner", "Admin", "Builder"]);
const MANAGER_ROLES = new Set(["Owner", "Admin"]);

export type SpaceMemberRole = typeof SPACE_MEMBER_ROLES[number];

export type SpaceAccess = {
  id: string;
  name: string;
  width: number;
  height: number | null;
  creatorId: string;
  members?: { role: string }[];
  settings?: { visibility?: string | null; joinPolicy?: string | null } | null;
};

export function cleanSpaceRole(role: unknown): SpaceMemberRole {
  return SPACE_MEMBER_ROLES.includes(role as SpaceMemberRole) ? role as SpaceMemberRole : "Member";
}

export async function getSpaceForUser(spaceId: string, userId: string) {
  return client.space.findUnique({
    where: { id: spaceId },
    select: {
      id: true,
      name: true,
      width: true,
      height: true,
      creatorId: true,
      settings: { select: { visibility: true, joinPolicy: true } },
      members: { where: { userId }, select: { role: true } },
    },
  });
}

export function getSpaceRole(space: { creatorId: string; members?: { role: string }[] }, userId: string) {
  if (space.creatorId === userId) return "Owner";
  return cleanSpaceRole(space.members?.[0]?.role || "Guest");
}

export function canEditSpace(space: { creatorId: string; members?: { role: string }[] }, userId: string) {
  return EDITOR_ROLES.has(getSpaceRole(space, userId));
}

export function canManageMembers(space: { creatorId: string; members?: { role: string }[] }, userId: string) {
  return MANAGER_ROLES.has(getSpaceRole(space, userId));
}

export function canEnterSpace(space: { creatorId: string; members?: { role: string }[]; settings?: { visibility?: string | null } | null }, userId: string) {
  if (space.creatorId === userId) return true;
  if ((space.members?.length || 0) > 0) return true;
  return (space.settings?.visibility || "Public") === "Public";
}

export function requireSpaceEntry(space: { creatorId: string; members?: { role: string }[]; settings?: { visibility?: string | null } | null }, userId: string, res: Response) {
  if (canEnterSpace(space, userId)) return true;
  res.status(403).json({ message: "This office is private. Ask an owner or admin for access." });
  return false;
}

export function requireSpaceEditor(space: { creatorId: string; members?: { role: string }[] }, userId: string, res: Response) {
  if (canEditSpace(space, userId)) return true;
  res.status(403).json({ message: "Only owners, admins, and builders can edit this office" });
  return false;
}

export function requireSpaceManager(space: { creatorId: string; members?: { role: string }[] }, userId: string, res: Response) {
  if (canManageMembers(space, userId)) return true;
  res.status(403).json({ message: "Only owners and admins can manage members" });
  return false;
}

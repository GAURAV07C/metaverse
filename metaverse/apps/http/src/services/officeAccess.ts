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

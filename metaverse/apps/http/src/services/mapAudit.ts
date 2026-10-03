import client from "@repo/db/client";

export function summarizeMapData(data: any) {
  const elements = Array.isArray(data?.elements) ? data.elements : [];
  const areas = Array.isArray(data?.areas) ? data.areas : [];
  return {
    elementCount: elements.length,
    areaCount: areas.length,
    roomCount: areas.filter((area: any) => area?.type === "room" || area?.type === "private").length,
    portalCount: areas.filter((area: any) => area?.type === "portal").length,
    spawnCount: areas.filter((area: any) => area?.type === "spawn").length,
    savedAt: typeof data?.savedAt === "string" ? data.savedAt : undefined,
  };
}

export async function writeMapAuditEvent(data: {
  spaceId: string;
  action: "draft_saved" | "version_restored" | "published";
  actorUserId?: string;
  summary?: unknown;
  versionId?: string;
  versionNumber?: number;
}) {
  try {
    const actor = data.actorUserId
      ? await client.user.findUnique({ where: { id: data.actorUserId }, select: { username: true } })
      : null;
    await (client as any).mapEditAuditEvent.create({
      data: {
        spaceId: data.spaceId,
        action: data.action,
        actorUserId: data.actorUserId,
        actorUsername: actor?.username,
        summary: data.summary as any,
        versionId: data.versionId,
        versionNumber: data.versionNumber,
      },
    });
  } catch (error) {
    console.warn("Failed to persist map audit event", error instanceof Error ? error.message : error);
  }
}

import client from "@repo/db/client";

export async function writeRoomInviteEvent(data: {
  spaceId: string;
  inviteId?: string;
  direction: string;
  status: string;
  fromUserId?: string;
  fromUsername?: string;
  toUserId?: string;
  toUsername?: string;
  roomId: string;
  roomName: string;
}) {
  try {
    await (client as any).roomInviteEvent.create({ data });
  } catch (error) {
    console.warn("Failed to persist room invite event", error instanceof Error ? error.message : error);
  }
}

export async function writeModerationAuditEvent(data: {
  spaceId: string;
  action: string;
  status: string;
  actorUserId?: string;
  actorUsername?: string;
  targetUserId?: string;
  targetUsername?: string;
}) {
  try {
    await (client as any).moderationAuditEvent.create({ data });
  } catch (error) {
    console.warn("Failed to persist moderation audit event", error instanceof Error ? error.message : error);
  }
}

export async function writeRoomSessionEvent(data: {
  spaceId: string;
  roomId?: string;
  roomName?: string;
  eventType: "joined" | "left" | "moved";
  userId?: string;
  username?: string;
  previousRoomId?: string;
}) {
  try {
    await (client as any).roomSessionEvent.create({ data });
  } catch (error) {
    console.warn("Failed to persist room session event", error instanceof Error ? error.message : error);
  }
}

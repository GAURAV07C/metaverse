import { RoomManager } from "../RoomManager";
import { User } from "../User";
import client from "@repo/db/client";

export class ChatHandler {
  static handleMessage(user: User, parsedData: any) {
    if (!user.spaceId) return;
    const message = typeof parsedData?.payload?.message === "string" ? parsedData.payload.message.trim() : "";
    if (!message || message.length > 500) return;
    const rawScope = typeof parsedData?.payload?.scope === "string" ? parsedData.payload.scope : "everyone";
    const scope = ["everyone", "nearby", "dm", "room"].includes(rawScope) ? rawScope : "everyone";
    const targetUserId = typeof parsedData?.payload?.targetUserId === "string" ? parsedData.payload.targetUserId : undefined;
    const targetUsername = typeof parsedData?.payload?.targetUsername === "string" ? parsedData.payload.targetUsername : undefined;
    const isRing = parsedData?.payload?.isRing === true;
    const roomManager = RoomManager.getInstance();
    const usersInSpace = roomManager.rooms.get(user.spaceId) || [];
    
    const payload = {
      type: "chat-receive",
      payload: {
        userId: user.userId,
        username: user.username,
        message,
        scope,
        targetUserId,
        targetUsername,
        isRing,
        timestamp: new Date().toISOString(),
      }
    } as const;

    if (scope === "dm") {
      const target = usersInSpace.find((u) =>
        (targetUserId && u.userId === targetUserId) ||
        (targetUsername && u.username?.toLowerCase() === targetUsername.toLowerCase())
      );
      if (target && target.id !== user.id) target.send(payload);
      return;
    }

    if (scope === "nearby") {
      roomManager.sendToUsers(payload, user.spaceId, (u) => u.id !== user.id && user.inProximityWith.has(u.id));
      return;
    }

    if (scope === "room") {
      const zones = roomManager.zones.get(user.spaceId) || [];
      const currentRoom = zones.find((z: any) =>
        (z.type === "room" || z.type === "private") &&
        user.x >= z.startX &&
        user.x < z.endX &&
        user.y >= z.startY &&
        user.y < z.endY
      );
      if (!currentRoom) return;
      roomManager.sendToUsers(payload, user.spaceId, (u) =>
        u.id !== user.id &&
        u.x >= currentRoom.startX &&
        u.x < currentRoom.endX &&
        u.y >= currentRoom.startY &&
        u.y < currentRoom.endY
      );
      return;
    }

    roomManager.broadcast(payload, user, user.spaceId);

    // Save chat history safely
    if ((client as any).chatMessage) {
      (client as any).chatMessage.create({
        data: {
          spaceId: user.spaceId,
          userId: user.userId,
          username: user.username || "Unknown",
          message,
          scope,
          targetUserId,
          isRing
        }
      }).catch((err: any) => console.error("Failed to save chat:", err));
    }
  }
}

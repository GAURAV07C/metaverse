import client from "@repo/db/client";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_PASSWORD } from "../config";
import { MediasoupManager } from "../MediasoupManager";
import { RoomManager } from "../RoomManager";
import type { User } from "../User";

export class JoinHandler {
  static async handleJoin(user: User, parsedData: any) {
    const spaceId = typeof parsedData?.payload?.spaceId === "string" ? parsedData.payload.spaceId : "";

    if (user.requestedSpaceId && user.requestedSpaceId !== spaceId) {
      user.rejectJoin(1008, "space-route-mismatch");
      return;
    }

    const token = typeof parsedData?.payload?.token === "string" ? parsedData.payload.token : "";
    if (!token) {
      user.rejectJoin(1008, "missing-token");
      return;
    }

    const userId = this.verifyUserId(token);
    if (!userId) {
      user.rejectJoin(1008, "invalid-token");
      return;
    }

    user.userId = userId;

    try {
      await this.loadUserProfile(user, userId);
      const space = await client.space.findFirst({
        where: { id: spaceId },
        include: {
          settings: true,
          members: { where: { userId }, select: { role: true } },
        },
      });

      if (!space) {
        user.rejectJoin(1008, "space-not-found");
        return;
      }

      if (!this.canEnterSpace(space, userId)) {
        user.rejectJoin(1008, "space-private");
        return;
      }

      const roomManager = RoomManager.getInstance();
      const addResult = await roomManager.addUser(spaceId, user);
      if (!addResult.ok) {
        user.rejectJoin(1013, addResult.reason || "sfu-owned-by-other-instance", {
          redirectUrl: addResult.redirectUrl,
          ownerInstanceId: addResult.ownerInstanceId,
        });
        return;
      }

      user.spaceId = spaceId;
      await roomManager.loadSpaceZones(spaceId);
      await roomManager.loadSpaceBounds(spaceId);

      const spawn = await this.pickSpawn(spaceId, space);
      user.x = spawn.x;
      user.y = spawn.y;
      roomManager.updateRoomSession(user);

      user.send({
        type: "space-joined",
        payload: {
          chatHistory: await this.loadRecentChat(spaceId),
          spawn,
          userId: user.userId,
          username: user.username,
          avatarUrl: user.avatarUrl,
          users: roomManager.serializeUsers(spaceId, user.id),
          roomSessions: roomManager.serializeRoomSessions(spaceId),
          currentRoomId: user.currentRoomId || null,
          groupLead: roomManager.getGroupLead(spaceId),
        },
      });

      this.sendExistingProducers(user, spaceId);
      this.broadcastJoined(user, spaceId);
      roomManager.checkProximity(user, spaceId);
    } catch (error) {
      console.error("Failed to join space", error instanceof Error ? error.message : error);
      user.send({ type: "webrtc-error", payload: { message: "Unable to join space. Please try again." } });
      user.rejectJoin(1011, "join-failed");
    }
  }

  private static verifyUserId(token: string) {
    try {
      const payload = jwt.verify(token, JWT_PASSWORD) as JwtPayload;
      return typeof payload.userId === "string" ? payload.userId : undefined;
    } catch (error) {
      console.warn("[WS] Invalid join token", error instanceof Error ? error.message : error);
      return undefined;
    }
  }

  private static async loadUserProfile(user: User, userId: string) {
    const dbUser = await client.user.findUnique({
      where: { id: userId },
      select: { username: true, avatar: { select: { imageUrl: true } } },
    });

    user.username = dbUser?.username ?? "Unknown";
    user.avatarUrl = dbUser?.avatar?.imageUrl ?? undefined;
  }

  private static async pickSpawn(spaceId: string, space: { width: number; height?: number | null }) {
    const roomManager = RoomManager.getInstance();
    const zones = roomManager.zones.get(spaceId) || [];
    const spawnZone = zones.find((zone: any) => zone.type === "spawn" && zone.isDefaultSpawn) ||
      zones.find((zone: any) => zone.type === "spawn");

    if (spawnZone || zones.length > 0) {
      const zone = spawnZone || zones[0];
      return {
        x: Math.floor((zone.startX + zone.endX) / 2),
        y: Math.floor((zone.startY + zone.endY) / 2),
      };
    }

    for (let i = 0; i < 200; i += 1) {
      const candidate = {
        x: Math.floor(Math.random() * space.width),
        y: Math.floor(Math.random() * (space.height ?? 1)),
      };
      if (await roomManager.canOccupy(spaceId, candidate.x, candidate.y)) return candidate;
    }

    return { x: 0, y: 0 };
  }

  private static canEnterSpace(space: { creatorId: string; members?: { role: string }[]; settings?: { visibility?: string | null } | null }, userId: string) {
    if (space.creatorId === userId) return true;
    if ((space.members?.length || 0) > 0) return true;
    return (space.settings?.visibility || "Public") === "Public";
  }

  private static async loadRecentChat(spaceId: string) {
    if (!(client as any).chatMessage) {
      console.warn("ChatMessage model not available in Prisma client. Restart dev server to generate.");
      return [];
    }

    try {
      const recentChats = await (client as any).chatMessage.findMany({
        where: { spaceId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return recentChats.reverse().map((chat: any) => ({
        userId: chat.userId,
        username: chat.username,
        message: chat.message,
        scope: chat.scope,
        targetUserId: chat.targetUserId,
        isRing: chat.isRing,
        timestamp: chat.createdAt.toISOString(),
      }));
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      return [];
    }
  }

  private static sendExistingProducers(user: User, spaceId: string) {
    for (const producer of MediasoupManager.getInstance().getProducersForSpace(spaceId, user.userId)) {
      if (!producer.userId) continue;
      user.send({
        type: "new-producer",
        payload: {
          producerId: producer.producerId,
          userId: producer.userId,
          appData: producer.appData,
        },
      });
    }
  }

  private static broadcastJoined(user: User, spaceId: string) {
    RoomManager.getInstance().broadcast(
      {
        type: "user-joined",
        payload: {
          userId: user.userId,
          username: user.username,
          avatarUrl: user.avatarUrl,
          status: user.status,
          x: user.x,
          y: user.y,
        },
      },
      user,
      spaceId,
    );
  }
}

import { WebSocket } from "ws";
import { RoomManager } from "./RoomManager";
import { OutgoingMessage } from "./types";
import client from "@repo/db/client";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_PASSWORD } from "./config";
import { MediasoupManager } from "./MediasoupManager";
import { MovementHandler } from "./handlers/MovementHandler";
import { ChatHandler } from "./handlers/ChatHandler";
import { WebRTCHandler } from "./handlers/WebRTCHandler";


function getRandomString(length: number) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

async function writeRoomInviteEvent(data: {
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

async function writeModerationAuditEvent(data: {
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

export class User {
  public id: string;
  public userId?: string;
  public username?: string;
  public avatarUrl?: string;
  public spaceId?: string;
  public status: "available" | "busy" | "focus" | "away" = "available";
  public x: number;
  public y: number;
  public inProximityWith: Set<string> = new Set();
  private ws: WebSocket;

  constructor(ws: WebSocket) {
    this.id = getRandomString(10);
    this.x = 0;
    this.y = 0;
    this.ws = ws;
    this.initHandlers();
  }

  initHandlers() {
    this.ws.on("message", async (data) => {
      // Tests sometimes send malformed/partial payloads; never throw and never
      // let invalid state updates desync other assertions.
      let parsedData: any;
      try {
        parsedData = JSON.parse(data.toString());
      } catch {
        return;
      }

      switch (parsedData?.type) {
        case "join": {
          const spaceId = typeof parsedData?.payload?.spaceId === "string" ? parsedData.payload.spaceId : "";
          const token = typeof parsedData?.payload?.token === "string" ? parsedData.payload.token : "";
          if (!token) {
            this.ws.close();
            return;
          }

          let userId: string | undefined;
          try {
            const payload = jwt.verify(token, JWT_PASSWORD) as JwtPayload;
            userId = typeof payload.userId === "string" ? payload.userId : undefined;
          } catch {
            this.ws.close();
            return;
          }

          if (!userId) {
            this.ws.close();
            return;
          }

          this.userId = userId;

          // Fetch username and avatar from DB for display
          const dbUser = await client.user.findUnique({
            where: { id: userId },
            select: { username: true, avatar: { select: { imageUrl: true } } },
          });
          this.username = dbUser?.username ?? 'Unknown';
          this.avatarUrl = dbUser?.avatar?.imageUrl ?? undefined;

          const space = await client.space.findFirst({
            where: { id: spaceId },
          });

          if (!space) {
            this.ws.close();
            return;
          }

          this.spaceId = spaceId;
          RoomManager.getInstance().addUser(spaceId, this);
          await RoomManager.getInstance().loadSpaceZones(spaceId);
          await RoomManager.getInstance().loadSpaceBounds(spaceId);

          let spawn = { x: 0, y: 0 };
          
          const zones = RoomManager.getInstance().zones.get(spaceId) || [];
          
          const spawnZone = zones.find((z: any) => z.type === "spawn");
          if (spawnZone || zones.length > 0) {
            const z = spawnZone || zones[0];
            spawn = {
              x: Math.floor((z.startX + z.endX) / 2),
              y: Math.floor((z.startY + z.endY) / 2)
            };
          } else {
            // Fallback to searching for a random unblocked spot in the space
            for (let i = 0; i < 200; i += 1) {
              const candidate = {
                x: Math.floor(Math.random() * space.width),
                y: Math.floor(Math.random() * (space.height ?? 1)),
              };
              if (await RoomManager.getInstance().canOccupy(spaceId, candidate.x, candidate.y)) {
                spawn = candidate;
                break;
              }
            }
          }
          this.x = spawn.x;
          this.y = spawn.y;

          this.send({
            type: "space-joined",
            payload: {
              spawn: { x: this.x, y: this.y },
              userId: this.userId,
              username: this.username,
              avatarUrl: this.avatarUrl,
              users:
                RoomManager.getInstance()
                  .rooms.get(spaceId)
                  ?.filter((x) => x.id !== this.id)
                  ?.map((u) => ({ id: u.id, userId: u.userId, username: u.username, avatarUrl: u.avatarUrl, status: u.status, x: u.x, y: u.y })) ?? [],
            },
          });

          RoomManager.getInstance().broadcast(
            {
              type: "user-joined",
              payload: {
                userId: this.userId,
                username: this.username,
                avatarUrl: this.avatarUrl,
                status: this.status,
                x: this.x,
                y: this.y,
              },
            },
            this,
            this.spaceId!,
          );

          RoomManager.getInstance().checkProximity(this, this.spaceId!);

          break;
        }

        case "move":
          await MovementHandler.handleMove(this, parsedData);
          break;
        case "teleport":
          await MovementHandler.handleTeleport(this, parsedData);
          break;
        case "chat-message":
          ChatHandler.handleMessage(this, parsedData);
          break;
        case "room-invite-send": {
          if (!this.spaceId || !this.userId) return;
          const targetUserId = typeof parsedData?.payload?.targetUserId === "string" ? parsedData.payload.targetUserId : "";
          const roomId = typeof parsedData?.payload?.roomId === "string" ? parsedData.payload.roomId : "";
          const roomName = typeof parsedData?.payload?.roomName === "string" ? parsedData.payload.roomName.slice(0, 80) : undefined;
          const roomUrl = typeof parsedData?.payload?.roomUrl === "string" ? parsedData.payload.roomUrl.slice(0, 500) : undefined;
          if (!targetUserId || !roomId || targetUserId === this.userId) return;
          const target = RoomManager.getInstance()
            .rooms.get(this.spaceId)
            ?.find((u) => u.userId === targetUserId);
          if (!target) return;
          const inviteId = `${this.userId}:${targetUserId}:${roomId}:${Date.now()}`;
          await writeRoomInviteEvent({
            spaceId: this.spaceId,
            inviteId,
            direction: "outgoing",
            status: "sent",
            fromUserId: this.userId,
            fromUsername: this.username,
            toUserId: targetUserId,
            toUsername: target.username,
            roomId,
            roomName: roomName || "Room",
          });
          target.send({
            type: "room-invite-receive",
            payload: {
              inviteId,
              fromUserId: this.userId,
              fromUsername: this.username,
              roomId,
              roomName,
              roomUrl,
              timestamp: new Date().toISOString(),
            },
          });
          break;
        }
        case "room-invite-respond": {
          if (!this.spaceId || !this.userId) return;
          const targetUserId = typeof parsedData?.payload?.targetUserId === "string" ? parsedData.payload.targetUserId : "";
          const roomId = typeof parsedData?.payload?.roomId === "string" ? parsedData.payload.roomId : "";
          const inviteId = typeof parsedData?.payload?.inviteId === "string" ? parsedData.payload.inviteId.slice(0, 160) : undefined;
          const roomName = typeof parsedData?.payload?.roomName === "string" ? parsedData.payload.roomName.slice(0, 80) : undefined;
          const response = parsedData?.payload?.response === "accepted" || parsedData?.payload?.response === "declined"
            ? parsedData.payload.response
            : "";
          if (!targetUserId || !roomId || !response) return;
          const target = RoomManager.getInstance()
            .rooms.get(this.spaceId)
            ?.find((u) => u.userId === targetUserId);
          if (!target) return;
          await writeRoomInviteEvent({
            spaceId: this.spaceId,
            inviteId,
            direction: "incoming",
            status: response,
            fromUserId: this.userId,
            fromUsername: this.username,
            toUserId: targetUserId,
            toUsername: target.username,
            roomId,
            roomName: roomName || "Room",
          });
          target.send({
            type: "room-invite-response",
            payload: {
              inviteId,
              fromUserId: this.userId,
              fromUsername: this.username,
              roomId,
              roomName,
              response,
              timestamp: new Date().toISOString(),
            },
          });
          break;
        }
        case "moderation-request": {
          if (!this.spaceId || !this.userId) return;
          const targetUserId = typeof parsedData?.payload?.targetUserId === "string" ? parsedData.payload.targetUserId : "";
          const action = typeof parsedData?.payload?.action === "string" ? parsedData.payload.action : "";
          const allowed = ["mute-audio", "stop-video", "stop-screen"];
          if (!targetUserId || !allowed.includes(action)) return;
          const targetUser = RoomManager.getInstance().rooms.get(this.spaceId)
            ?.find((u) => u.userId === targetUserId);
          await writeModerationAuditEvent({
            spaceId: this.spaceId,
            action,
            status: "sent",
            actorUserId: this.userId,
            actorUsername: this.username,
            targetUserId,
            targetUsername: targetUser?.username,
          });
          RoomManager.getInstance().sendToUsers(
            {
              type: "moderation-request",
              payload: {
                action,
                fromUserId: this.userId,
                fromUsername: this.username,
                timestamp: new Date().toISOString(),
              },
            },
            this.spaceId,
            (target) => target.userId === targetUserId,
          );
          break;
        }
        case "moderation-response": {
          if (!this.spaceId || !this.userId) return;
          const action = typeof parsedData?.payload?.action === "string" ? parsedData.payload.action : "";
          const accepted = Boolean(parsedData?.payload?.accepted);
          const allowed = ["mute-audio", "stop-video", "stop-screen"];
          if (!allowed.includes(action)) return;
          const requesterId = typeof parsedData?.payload?.requesterId === "string" ? parsedData.payload.requesterId : undefined;
          await writeModerationAuditEvent({
            spaceId: this.spaceId,
            action,
            status: accepted ? "applied" : "failed",
            actorUserId: requesterId,
            targetUserId: this.userId,
            targetUsername: this.username,
          });
          RoomManager.getInstance().sendToUsers(
            {
              type: "moderation-response",
              payload: {
                action,
                targetUserId: this.userId,
                targetUsername: this.username,
                accepted,
                timestamp: new Date().toISOString(),
              },
            },
            this.spaceId,
            (target) => requesterId ? target.userId === requesterId : target.userId !== this.userId,
          );
          break;
        }
        case "reaction-send": {
          if (!this.spaceId || !this.userId) return;
          const emoji = typeof parsedData?.payload?.emoji === "string" ? parsedData.payload.emoji.trim() : "";
          if (!emoji || emoji.length > 8) return;
          RoomManager.getInstance().broadcast(
            {
              type: "reaction-receive",
              payload: {
                userId: this.userId,
                username: this.username,
                emoji,
                timestamp: new Date().toISOString(),
              },
            },
            this,
            this.spaceId,
          );
          break;
        }
        case "status-set": {
          if (!this.spaceId || !this.userId) return;
          const rawStatus = typeof parsedData?.payload?.status === "string" ? parsedData.payload.status : "";
          const allowed = ["available", "busy", "focus", "away"] as const;
          if (!allowed.includes(rawStatus as any)) return;
          this.status = rawStatus as typeof allowed[number];
          RoomManager.getInstance().broadcast(
            {
              type: "status-update",
              payload: {
                userId: this.userId,
                username: this.username,
                status: this.status,
                timestamp: new Date().toISOString(),
              },
            },
            this,
            this.spaceId,
          );
          break;
        }
        case "webrtc-get-router-rtp-capabilities":
          await WebRTCHandler.handleGetRouterRtpCapabilities(this);
          break;
        case "webrtc-create-transport":
          await WebRTCHandler.handleCreateTransport(this);
          break;
        case "webrtc-connect-transport":
          await WebRTCHandler.handleConnectTransport(this, parsedData);
          break;
        case "webrtc-produce":
          await WebRTCHandler.handleProduce(this, parsedData);
          break;
        case "webrtc-consume":
          await WebRTCHandler.handleConsume(this, parsedData);
          break;
      }
    });
  }

  destroy() {
    if (!this.spaceId) return;
    RoomManager.getInstance().broadcast(
      {
        type: "user-left",
        payload: {
          userId: this.userId,
        },
      },
      this,
      this.spaceId!,
    );
    RoomManager.getInstance().removeUser(this, this.spaceId!);
  }

  send(payload: OutgoingMessage) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }
}

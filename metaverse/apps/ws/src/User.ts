import { WebSocket } from "ws";
import { RoomManager } from "./RoomManager";
import { OutgoingMessage } from "./types";
import { MediasoupManager } from "./MediasoupManager";
import { MovementHandler } from "./handlers/MovementHandler";
import { ChatHandler } from "./handlers/ChatHandler";
import { WebRTCHandler } from "./handlers/WebRTCHandler";
import { JoinHandler } from "./handlers/JoinHandler";
import { CollaborationHandler } from "./handlers/CollaborationHandler";
import { getRandomString } from "./utils/ids";

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
  public readonly requestedSpaceId?: string;

  private ws: WebSocket;

  constructor(ws: WebSocket, requestedSpaceId?: string) {
    this.id = getRandomString(10);
    this.x = 0;
    this.y = 0;
    this.ws = ws;
    this.requestedSpaceId = requestedSpaceId;
    this.initHandlers();
  }

  public rejectJoin(code: number, reason: string, extra?: Record<string, unknown>) {
    console.warn(`[WS] Closing connection: ${reason}`, {
      userId: this.userId,
      spaceId: this.spaceId,
      ...extra,
    });
    this.send({
      type: "join-error",
      payload: {
        reason,
        message: this.joinErrorMessage(reason),
        ...(extra || {}),
      },
    });
    this.ws.close(code, reason);
  }

  private joinErrorMessage(reason: string) {
    switch (reason) {
      case "invalid-token":
        return "Your session token was rejected by the realtime server.";
      case "space-not-found":
        return "The realtime server could not find this space.";
      case "join-failed":
        return "The realtime server failed while joining the space.";
      case "sfu-owned-by-other-instance":
        return "This space is already hosted by another realtime media server. Enable sticky routing for this space.";
      case "space-route-mismatch":
        return "Realtime route spaceId did not match the join request.";
      default:
        return "The realtime server rejected the join request.";
    }
  }

  initHandlers() {
    this.ws.on("message", async (data) => {
      const parsedData = this.parseMessage(data);
      if (!parsedData) return;

      switch (parsedData.type) {
        case "join":
          await JoinHandler.handleJoin(this, parsedData);
          break;
        case "move":
          await MovementHandler.handleMove(this, parsedData);
          break;
        case "teleport":
          await MovementHandler.handleTeleport(this, parsedData);
          break;
        case "chat-message":
          ChatHandler.handleMessage(this, parsedData);
          break;
        case "room-invite-send":
          await CollaborationHandler.handleRoomInviteSend(this, parsedData);
          break;
        case "room-invite-respond":
          await CollaborationHandler.handleRoomInviteRespond(this, parsedData);
          break;
        case "moderation-request":
          await CollaborationHandler.handleModerationRequest(this, parsedData);
          break;
        case "moderation-response":
          await CollaborationHandler.handleModerationResponse(this, parsedData);
          break;
        case "reaction-send":
          CollaborationHandler.handleReactionSend(this, parsedData);
          break;
        case "status-set":
          CollaborationHandler.handleStatusSet(this, parsedData);
          break;
        case "webrtc-get-router-rtp-capabilities":
          await WebRTCHandler.handleGetRouterRtpCapabilities(this, parsedData);
          break;
        case "webrtc-create-transport":
          await WebRTCHandler.handleCreateTransport(this, parsedData);
          break;
        case "webrtc-connect-transport":
          await WebRTCHandler.handleConnectTransport(this, parsedData);
          break;
        case "webrtc-produce":
          await WebRTCHandler.handleProduce(this, parsedData);
          break;
        case "webrtc-stop-producer":
          await WebRTCHandler.handleStopProducer(this, parsedData);
          break;
        case "webrtc-consume":
          await WebRTCHandler.handleConsume(this, parsedData);
          break;
      }
    });
  }

  destroy() {
    if (!this.spaceId) return;

    const closedProducerIds = MediasoupManager.getInstance().closeUserProducers(this.spaceId, this.userId);
    closedProducerIds.forEach((producerId) => {
      RoomManager.getInstance().broadcast(
        {
          type: "producer-closed",
          payload: {
            producerId,
            userId: this.userId,
          },
        },
        this,
        this.spaceId!,
      );
    });

    RoomManager.getInstance().broadcast(
      {
        type: "user-left",
        payload: {
          userId: this.userId,
        },
      },
      this,
      this.spaceId,
    );
    RoomManager.getInstance().removeUser(this, this.spaceId);
  }

  send(payload: OutgoingMessage) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private parseMessage(data: WebSocket.RawData) {
    try {
      return JSON.parse(data.toString());
    } catch {
      return undefined;
    }
  }
}

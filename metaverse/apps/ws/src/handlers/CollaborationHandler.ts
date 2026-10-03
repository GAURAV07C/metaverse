import { RoomManager } from "../RoomManager";
import type { User } from "../User";
import { writeModerationAuditEvent, writeRoomInviteEvent } from "../services/eventPersistence";

const MODERATION_ACTIONS = ["mute-audio", "stop-video", "stop-screen"] as const;
const USER_STATUSES = ["available", "busy", "focus", "away"] as const;

type ModerationAction = typeof MODERATION_ACTIONS[number];

export class CollaborationHandler {
  static async handleRoomInviteSend(user: User, parsedData: any) {
    if (!user.spaceId || !user.userId) return;

    const targetUserId = typeof parsedData?.payload?.targetUserId === "string" ? parsedData.payload.targetUserId : "";
    const roomId = typeof parsedData?.payload?.roomId === "string" ? parsedData.payload.roomId : "";
    const roomName = typeof parsedData?.payload?.roomName === "string" ? parsedData.payload.roomName.slice(0, 80) : undefined;
    const roomUrl = typeof parsedData?.payload?.roomUrl === "string" ? parsedData.payload.roomUrl.slice(0, 500) : undefined;
    if (!targetUserId || !roomId || targetUserId === user.userId) return;

    const target = RoomManager.getInstance().findUserByUserId(user.spaceId, targetUserId);
    if (!target) return;

    const inviteId = `${user.userId}:${targetUserId}:${roomId}:${Date.now()}`;
    await writeRoomInviteEvent({
      spaceId: user.spaceId,
      inviteId,
      direction: "outgoing",
      status: "sent",
      fromUserId: user.userId,
      fromUsername: user.username,
      toUserId: targetUserId,
      toUsername: target.username,
      roomId,
      roomName: roomName || "Room",
    });

    target.send({
      type: "room-invite-receive",
      payload: {
        inviteId,
        fromUserId: user.userId,
        fromUsername: user.username,
        roomId,
        roomName,
        roomUrl,
        timestamp: new Date().toISOString(),
      },
    });
  }

  static async handleRoomInviteRespond(user: User, parsedData: any) {
    if (!user.spaceId || !user.userId) return;

    const targetUserId = typeof parsedData?.payload?.targetUserId === "string" ? parsedData.payload.targetUserId : "";
    const roomId = typeof parsedData?.payload?.roomId === "string" ? parsedData.payload.roomId : "";
    const inviteId = typeof parsedData?.payload?.inviteId === "string" ? parsedData.payload.inviteId.slice(0, 160) : undefined;
    const roomName = typeof parsedData?.payload?.roomName === "string" ? parsedData.payload.roomName.slice(0, 80) : undefined;
    const response = parsedData?.payload?.response === "accepted" || parsedData?.payload?.response === "declined"
      ? parsedData.payload.response
      : "";
    if (!targetUserId || !roomId || !response) return;

    const target = RoomManager.getInstance().findUserByUserId(user.spaceId, targetUserId);
    if (!target) return;

    await writeRoomInviteEvent({
      spaceId: user.spaceId,
      inviteId,
      direction: "incoming",
      status: response,
      fromUserId: user.userId,
      fromUsername: user.username,
      toUserId: targetUserId,
      toUsername: target.username,
      roomId,
      roomName: roomName || "Room",
    });

    target.send({
      type: "room-invite-response",
      payload: {
        inviteId,
        fromUserId: user.userId,
        fromUsername: user.username,
        roomId,
        roomName,
        response,
        timestamp: new Date().toISOString(),
      },
    });
  }

  static async handleModerationRequest(user: User, parsedData: any) {
    if (!user.spaceId || !user.userId) return;

    const targetUserId = typeof parsedData?.payload?.targetUserId === "string" ? parsedData.payload.targetUserId : "";
    const action = this.readModerationAction(parsedData);
    if (!targetUserId || !action) return;

    const targetUser = RoomManager.getInstance().findUserByUserId(user.spaceId, targetUserId);
    await writeModerationAuditEvent({
      spaceId: user.spaceId,
      action,
      status: "sent",
      actorUserId: user.userId,
      actorUsername: user.username,
      targetUserId,
      targetUsername: targetUser?.username,
    });

    RoomManager.getInstance().sendToUsers(
      {
        type: "moderation-request",
        payload: {
          action,
          fromUserId: user.userId,
          fromUsername: user.username,
          timestamp: new Date().toISOString(),
        },
      },
      user.spaceId,
      target => target.userId === targetUserId,
    );
  }

  static async handleModerationResponse(user: User, parsedData: any) {
    if (!user.spaceId || !user.userId) return;

    const action = this.readModerationAction(parsedData);
    if (!action) return;

    const accepted = Boolean(parsedData?.payload?.accepted);
    const requesterId = typeof parsedData?.payload?.requesterId === "string" ? parsedData.payload.requesterId : undefined;

    await writeModerationAuditEvent({
      spaceId: user.spaceId,
      action,
      status: accepted ? "applied" : "failed",
      actorUserId: requesterId,
      targetUserId: user.userId,
      targetUsername: user.username,
    });

    RoomManager.getInstance().sendToUsers(
      {
        type: "moderation-response",
        payload: {
          action,
          targetUserId: user.userId,
          targetUsername: user.username,
          accepted,
          timestamp: new Date().toISOString(),
        },
      },
      user.spaceId,
      target => requesterId ? target.userId === requesterId : target.userId !== user.userId,
    );
  }

  static handleReactionSend(user: User, parsedData: any) {
    if (!user.spaceId || !user.userId) return;

    const emoji = typeof parsedData?.payload?.emoji === "string" ? parsedData.payload.emoji.trim() : "";
    if (!emoji || emoji.length > 8) return;

    RoomManager.getInstance().broadcast(
      {
        type: "reaction-receive",
        payload: {
          userId: user.userId,
          username: user.username,
          emoji,
          timestamp: new Date().toISOString(),
        },
      },
      user,
      user.spaceId,
    );
  }

  static handleStatusSet(user: User, parsedData: any) {
    if (!user.spaceId || !user.userId) return;

    const rawStatus = typeof parsedData?.payload?.status === "string" ? parsedData.payload.status : "";
    if (!USER_STATUSES.includes(rawStatus as any)) return;

    user.status = rawStatus as typeof USER_STATUSES[number];
    RoomManager.getInstance().broadcast(
      {
        type: "status-update",
        payload: {
          userId: user.userId,
          username: user.username,
          status: user.status,
          timestamp: new Date().toISOString(),
        },
      },
      user,
      user.spaceId,
    );
  }

  static handleGroupLeadSet(user: User, parsedData: any) {
    if (!user.spaceId || !user.userId) return;
    const enabled = Boolean(parsedData?.payload?.enabled);
    RoomManager.getInstance().setGroupLead(user, enabled);
  }

  private static readModerationAction(parsedData: any): ModerationAction | undefined {
    const action = typeof parsedData?.payload?.action === "string" ? parsedData.payload.action : "";
    return MODERATION_ACTIONS.includes(action as ModerationAction) ? action as ModerationAction : undefined;
  }
}

import client from "@repo/db/client";
import type { User } from "./User";
import { OutgoingMessage } from "./types";
import { RealtimeBus } from "./RealtimeBus";
import { SpaceBoundsService } from "./services/SpaceBoundsService";
import {
  arePeersInAudioRange,
  getAudioRoomAt,
  getSeatAt,
  getSeatsInRoom,
  isInsideZone,
  type SpatialPeer,
} from "./services/spatialRules";

type PresencePeer = SpatialPeer & {
  id: string;
  userId?: string;
  username?: string;
  avatarUrl?: string;
  status?: "available" | "busy" | "focus" | "away";
  x: number;
  y: number;
};

export class RoomManager {
  rooms: Map<string, User[]> = new Map();
  zones: Map<string, any[]> = new Map();
  remotePeers: Map<string, Map<string, PresencePeer>> = new Map();
  static instance: RoomManager;
  private spaceBounds = new SpaceBoundsService();

  private constructor() {
    this.rooms = new Map();
    RealtimeBus.getInstance().onEvent((event) => {
      if (event.kind === "broadcast") this.handleRemoteBroadcast(event.spaceId, event.senderConnectionId, event.message);
    });
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new RoomManager();
    }
    return this.instance;
  }

  public removeUser(user: User, spaceId: string) {
    if (!this.rooms.has(spaceId)) {
      return;
    }
    this.rooms.set(
      spaceId,
      this.rooms.get(spaceId)?.filter((u) => u.id !== user.id) ?? [],
    );
    if ((this.rooms.get(spaceId)?.length ?? 0) === 0) {
      this.rooms.delete(spaceId);
      this.zones.delete(spaceId);
      this.spaceBounds.clear(spaceId);
      this.remotePeers.delete(spaceId);
      RealtimeBus.getInstance().releaseSpaceOwner(spaceId);
    }
  }

  public async addUser(spaceId: string, user: User) {
    const owner = await RealtimeBus.getInstance().claimSpaceOwner(spaceId);
    if (!owner.ok) {
      return { ok: false, reason: "sfu-owned-by-other-instance", ownerInstanceId: owner.ownerInstanceId, redirectUrl: owner.ownerPublicUrl };
    }
    RealtimeBus.getInstance().subscribeSpace(spaceId);
    const current = this.rooms.get(spaceId) ?? [];
    if (current.some((u) => u.id === user.id)) return { ok: true };
    if (!this.rooms.has(spaceId)) {
      this.rooms.set(spaceId, [user]);
      return { ok: true };
    }
    this.rooms.set(spaceId, [...(this.rooms.get(spaceId) ?? []), user]);
    return { ok: true };
  }

  public broadcast(message: OutgoingMessage, user: User, roomId: string) {
    RealtimeBus.getInstance().publishBroadcast(roomId, message, { id: user.id, userId: user.userId });
    if (!this.rooms.has(roomId)) return;
    this.rooms.get(roomId)?.forEach((u) => {
      if (u.id !== user.id) {
        u.send(message);
      }
    });
  }

  public sendToUsers(message: OutgoingMessage, roomId: string, predicate: (user: User) => boolean) {
    if (!this.rooms.has(roomId)) return;
    this.rooms.get(roomId)?.forEach((u) => {
      if (predicate(u)) u.send(message);
    });
  }

  public findUserByUserId(spaceId: string, userId: string) {
    return this.rooms.get(spaceId)?.find((user) => user.userId === userId);
  }

  public serializeUsers(spaceId: string, excludeConnectionId?: string) {
    return this.rooms.get(spaceId)
      ?.filter((user) => user.id !== excludeConnectionId)
      .map((user) => ({
        id: user.id,
        userId: user.userId,
        username: user.username,
        avatarUrl: user.avatarUrl,
        status: user.status,
        x: user.x,
        y: user.y,
      })) ?? [];
  }

  private handleRemoteBroadcast(spaceId: string, senderConnectionId: string | undefined, message: OutgoingMessage) {
    this.trackRemotePresence(spaceId, senderConnectionId, message);
    this.rooms.get(spaceId)?.forEach((user) => {
      if (senderConnectionId && user.id === senderConnectionId) return;
      user.send(message);
    });
    this.recheckLocalProximity(spaceId);
  }

  private trackRemotePresence(spaceId: string, senderConnectionId: string | undefined, message: OutgoingMessage) {
    if (!senderConnectionId) return;
    if (!this.remotePeers.has(spaceId)) this.remotePeers.set(spaceId, new Map());
    const peers = this.remotePeers.get(spaceId)!;

    if (message?.type === "user-left") {
      peers.delete(senderConnectionId);
      return;
    }

    const payload = message?.payload || {};
    if (message?.type === "user-joined") {
      peers.set(senderConnectionId, {
        id: senderConnectionId,
        userId: payload.userId,
        username: payload.username,
        avatarUrl: payload.avatarUrl,
        status: payload.status || "available",
        x: payload.x,
        y: payload.y,
      });
      return;
    }

    if (message?.type === "movement") {
      const existing = peers.get(senderConnectionId);
      peers.set(senderConnectionId, {
        id: senderConnectionId,
        userId: payload.userId || existing?.userId,
        username: existing?.username,
        avatarUrl: existing?.avatarUrl,
        status: existing?.status || "available",
        x: payload.x,
        y: payload.y,
      });
      return;
    }

    if (message?.type === "status-update") {
      const existing = peers.get(senderConnectionId);
      if (existing) peers.set(senderConnectionId, { ...existing, status: payload.status || existing.status });
    }
  }

  public async loadSpaceZones(spaceId: string) {
    if (this.zones.has(spaceId)) return;
    const zones = await client.privateZone.findMany({ where: { spaceId } });
    this.zones.set(spaceId, zones);
  }

  public clearSpaceBounds(spaceId: string) {
    this.spaceBounds.clear(spaceId);
  }

  public async loadSpaceBounds(spaceId: string, forceReload = false) {
    return this.spaceBounds.load(spaceId, forceReload);
  }

  public async canOccupy(spaceId: string, x: number, y: number) {
    return this.spaceBounds.canOccupy(spaceId, x, y);
  }

  public getAudioRoomAt(spaceId: string, x: number, y: number) {
    return getAudioRoomAt(this.zones.get(spaceId) || [], x, y);
  }

  public getSeatAt(spaceId: string, x: number, y: number) {
    return getSeatAt(this.zones.get(spaceId) || [], x, y);
  }

  public getSeatsInRoom(spaceId: string, room: any) {
    return getSeatsInRoom(this.zones.get(spaceId) || [], room);
  }

  private getPresencePeers(spaceId: string): Array<PresencePeer | User> {
    const localPeers = this.rooms.get(spaceId) || [];
    const remotePeers = Array.from(this.remotePeers.get(spaceId)?.values() || []);
    return [...localPeers, ...remotePeers];
  }

  public canEnterDynamic(user: User, x: number, y: number): { ok: boolean; reason?: string } {
    if (!user.spaceId) return { ok: false, reason: 'not-in-space' };
    const users = this.rooms.get(user.spaceId) || [];
    const targetSeat = this.getSeatAt(user.spaceId, x, y);

    if (targetSeat) {
      const occupied = users.some((other) =>
        other.id !== user.id &&
        isInsideZone(other.x, other.y, targetSeat)
      );
      if (occupied) return { ok: false, reason: 'spot-occupied' };
    }

    const targetRoom = this.getAudioRoomAt(user.spaceId, x, y);
    const currentRoom = this.getAudioRoomAt(user.spaceId, user.x, user.y);
    if (!targetRoom || currentRoom?.id === targetRoom.id) return { ok: true };

    const seats = this.getSeatsInRoom(user.spaceId, targetRoom);
    if (seats.length === 0) return { ok: true };

    const occupants = users.filter((other) =>
      other.id !== user.id &&
      isInsideZone(other.x, other.y, targetRoom)
    );
    if (occupants.length >= seats.length) {
      return { ok: false, reason: 'room-full' };
    }

    return { ok: true };
  }

  public async canEnterTile(user: User, x: number, y: number): Promise<{ ok: boolean; reason?: string }> {
    if (!user.spaceId) return { ok: false, reason: 'not-in-space' };
    const canOccupyStatic = await this.canOccupy(user.spaceId, x, y);
    if (!canOccupyStatic) return { ok: false, reason: 'blocked' };
    return this.canEnterDynamic(user, x, y);
  }

  public checkProximity(user: User, spaceId: string) {
    const peers = this.getPresencePeers(spaceId);
    peers.forEach((otherUser) => {
      if (user.id === otherUser.id) return;
      const inRange = arePeersInAudioRange(this.zones.get(spaceId) || [], user, otherUser);
      const alreadyInProximity = user.inProximityWith.has(otherUser.id);

      if (inRange && !alreadyInProximity) {
        user.inProximityWith.add(otherUser.id);

        user.send({
          type: "proximity-entered",
          payload: { userId: otherUser.userId },
        });
        if (otherUser instanceof Object && "send" in otherUser && typeof (otherUser as any).send === "function") {
          (otherUser as User).inProximityWith.add(user.id);
          (otherUser as User).send({
            type: "proximity-entered",
            payload: { userId: user.userId },
          });
        }
      } else if (!inRange && alreadyInProximity) {
        user.inProximityWith.delete(otherUser.id);

        user.send({
          type: "proximity-left",
          payload: { userId: otherUser.userId },
        });
        if (otherUser instanceof Object && "send" in otherUser && typeof (otherUser as any).send === "function") {
          (otherUser as User).inProximityWith.delete(user.id);
          (otherUser as User).send({
            type: "proximity-left",
            payload: { userId: user.userId },
          });
        }
      }
    });
  }

  private recheckLocalProximity(spaceId: string) {
    this.rooms.get(spaceId)?.forEach((user) => this.checkProximity(user, spaceId));
  }
}

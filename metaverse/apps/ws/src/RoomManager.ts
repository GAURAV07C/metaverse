import client from "@repo/db/client";
import type { User } from "./User";
import { OutgoingMessage } from "./types";

export class RoomManager {
  rooms: Map<string, User[]> = new Map();
  zones: Map<string, any[]> = new Map();
  spaceBounds: Map<string, { width: number; height: number; blocked: Set<string> }> = new Map();
  static instance: RoomManager;

  private constructor() {
    this.rooms = new Map();
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
      this.spaceBounds.delete(spaceId);
    }
  }

  public addUser(spaceId: string, user: User) {
    const current = this.rooms.get(spaceId) ?? [];
    if (current.some((u) => u.id === user.id)) return;
    if (!this.rooms.has(spaceId)) {
      this.rooms.set(spaceId, [user]);
      return;
    }
    this.rooms.set(spaceId, [...(this.rooms.get(spaceId) ?? []), user]);
  }

  public broadcast(message: OutgoingMessage, user: User, roomId: string) {
    if (!this.rooms.has(roomId)) {
      return;
    }
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

  public async loadSpaceZones(spaceId: string) {
    if (this.zones.has(spaceId)) return;
    const zones = await client.privateZone.findMany({ where: { spaceId } });
    this.zones.set(spaceId, zones);
  }

  public clearSpaceBounds(spaceId: string) {
    this.spaceBounds.delete(spaceId);
  }

  public async loadSpaceBounds(spaceId: string, forceReload = false) {
    if (!forceReload && this.spaceBounds.has(spaceId)) return this.spaceBounds.get(spaceId);

    const space = await client.space.findUnique({
      where: { id: spaceId },
      select: {
        width: true,
        height: true,
        elements: {
          select: {
            x: true,
            y: true,
            elementId: true,
            customData: true,
            element: {
              select: { id: true, name: true, category: true, width: true, height: true, static: true },
            },
          },
        },
      },
    });

    if (!space || !space.height) return undefined;

    const blocked = new Set<string>();
    for (const placement of space.elements) {
      if (!placement.element.static) continue;

      const customData = typeof placement.customData === 'string' ? JSON.parse(placement.customData) : (placement.customData || {});
      const category = String(customData.category || placement.element.category || '').toLowerCase();
      const name = String(customData.name || placement.element.name || '').toLowerCase();
      const elementId = String(placement.elementId || placement.element.id || '').toLowerCase();

      // Room floors and areas are WALKABLE
      if (category.includes('room') || category.includes('floor')) continue;

      // Seating (chairs, sofas, couches, benches, stools) are WALKABLE so avatars can sit!
      const isSeating = category.includes('seating') || name.includes('chair') || name.includes('sofa') || name.includes('couch') || name.includes('bench') || name.includes('stool') || name.includes('seat') || elementId.includes('chair');
      if (isSeating) continue;

      const w = customData.width ?? placement.element.width;
      const h = customData.height ?? placement.element.height;

      for (let x = placement.x; x < placement.x + w; x++) {
        for (let y = placement.y; y < placement.y + h; y++) {
          blocked.add(`${x}:${y}`);
        }
      }
    }

    const bounds = { width: space.width, height: space.height, blocked };
    this.spaceBounds.set(spaceId, bounds);
    return bounds;
  }

  public async canOccupy(spaceId: string, x: number, y: number) {
    const bounds = await this.loadSpaceBounds(spaceId);
    if (!bounds) return true; // If no bounds, allow move inside space
    if (x < 0 || y < 0 || x >= bounds.width || y >= bounds.height) return false;
    return !bounds.blocked.has(`${x}:${y}`);
  }

  private isAudioRoom(zone: any) {
    return zone?.type === 'room' || zone?.type === 'private';
  }

  private isInsideZone(x: number, y: number, zone: any) {
    return x >= zone.startX && x < zone.endX && y >= zone.startY && y < zone.endY;
  }

  public getAudioRoomAt(spaceId: string, x: number, y: number) {
    const zones = this.zones.get(spaceId) || [];
    return zones.find((zone: any) => this.isAudioRoom(zone) && this.isInsideZone(x, y, zone));
  }

  public getSeatAt(spaceId: string, x: number, y: number) {
    const zones = this.zones.get(spaceId) || [];
    return zones.find((zone: any) => zone.type === 'seat' && this.isInsideZone(x, y, zone));
  }

  public getSeatsInRoom(spaceId: string, room: any) {
    const zones = this.zones.get(spaceId) || [];
    return zones.filter((zone: any) =>
      zone.type === 'seat' &&
      zone.startX >= room.startX &&
      zone.endX <= room.endX &&
      zone.startY >= room.startY &&
      zone.endY <= room.endY
    );
  }

  public canEnterDynamic(user: User, x: number, y: number): { ok: boolean; reason?: string } {
    if (!user.spaceId) return { ok: false, reason: 'not-in-space' };
    const users = this.rooms.get(user.spaceId) || [];
    const targetSeat = this.getSeatAt(user.spaceId, x, y);

    if (targetSeat) {
      const occupied = users.some((other) =>
        other.id !== user.id &&
        this.isInsideZone(other.x, other.y, targetSeat)
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
      this.isInsideZone(other.x, other.y, targetRoom)
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
    const PROXIMITY_THRESHOLD = 5; // Distance in grid units
    const usersInRoom = this.rooms.get(spaceId) || [];
    const zonesInRoom = this.zones.get(spaceId) || [];

    const isAudioRoom = (z: any) => z.type === 'room' || z.type === 'private';
    const getZone = (u: User, typeFilter?: string) => {
      return zonesInRoom.find(z => (typeFilter ? z.type === typeFilter : isAudioRoom(z)) && u.x >= z.startX && u.x < z.endX && u.y >= z.startY && u.y < z.endY);
    };
    
    const userZone = getZone(user);
    const userSpotlightZone = getZone(user, 'spotlight');

    usersInRoom.forEach((otherUser) => {
      if (user.id === otherUser.id) return;

      const otherUserZone = getZone(otherUser);
      const otherUserSpotlightZone = getZone(otherUser, 'spotlight');
      let inRange = false;

      if (userZone || otherUserZone) {
        // If either is in a zone, they must be in the SAME zone to be in proximity
        inRange = Boolean(userZone && otherUserZone && userZone.id === otherUserZone.id);
      } else {
        // Normal distance check
        const distance = Math.sqrt(
          Math.pow(user.x - otherUser.x, 2) + Math.pow(user.y - otherUser.y, 2)
        );
        inRange = distance <= PROXIMITY_THRESHOLD;
      }

      // Spotlight override: If either is in a spotlight AND they share the same audio context (both in room X, or both public)
      if ((userSpotlightZone || otherUserSpotlightZone) && (userZone?.id === otherUserZone?.id)) {
          inRange = true;
      }

      const alreadyInProximity = user.inProximityWith.has(otherUser.id);

      if (inRange && !alreadyInProximity) {
        // Enter proximity
        user.inProximityWith.add(otherUser.id);
        otherUser.inProximityWith.add(user.id);

        user.send({
          type: "proximity-entered",
          payload: { userId: otherUser.userId },
        });
        otherUser.send({
          type: "proximity-entered",
          payload: { userId: user.userId },
        });
      } else if (!inRange && alreadyInProximity) {
        // Leave proximity
        user.inProximityWith.delete(otherUser.id);
        otherUser.inProximityWith.delete(user.id);

        user.send({
          type: "proximity-left",
          payload: { userId: otherUser.userId },
        });
        otherUser.send({
          type: "proximity-left",
          payload: { userId: user.userId },
        });
      }
    });
  }
}

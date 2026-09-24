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

  public async loadSpaceZones(spaceId: string) {
    if (this.zones.has(spaceId)) return;
    const zones = await client.privateZone.findMany({ where: { spaceId } });
    this.zones.set(spaceId, zones);
  }

  public async loadSpaceBounds(spaceId: string) {
    if (this.spaceBounds.has(spaceId)) return this.spaceBounds.get(spaceId);

    const space = await client.space.findUnique({
      where: { id: spaceId },
      select: {
        width: true,
        height: true,
        elements: {
          include: {
            element: {
              select: { width: true, height: true, static: true },
            },
          },
        },
      },
    });

    if (!space || !space.height) return undefined;

    const blocked = new Set<string>();
    for (const placement of space.elements) {
      if (!placement.element.static) continue;
      for (let x = placement.x; x < placement.x + placement.element.width; x++) {
        for (let y = placement.y; y < placement.y + placement.element.height; y++) {
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
    if (!bounds) return false;
    if (x < 0 || y < 0 || x >= bounds.width || y >= bounds.height) return false;
    return !bounds.blocked.has(`${x}:${y}`);
  }

  public checkProximity(user: User, spaceId: string) {
    const PROXIMITY_THRESHOLD = 5; // Distance in grid units
    const usersInRoom = this.rooms.get(spaceId) || [];
    const zonesInRoom = this.zones.get(spaceId) || [];

    const getZone = (u: User) => {
      return zonesInRoom.find(z => u.x >= z.startX && u.x <= z.endX && u.y >= z.startY && u.y <= z.endY);
    };
    
    const userZone = getZone(user);

    usersInRoom.forEach((otherUser) => {
      if (user.id === otherUser.id) return;

      const otherUserZone = getZone(otherUser);
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

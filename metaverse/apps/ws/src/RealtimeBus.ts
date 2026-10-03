import Redis from "ioredis";
import { randomUUID } from "crypto";
import type { OutgoingMessage } from "./types";

type BroadcastEvent = {
  kind: "broadcast";
  instanceId: string;
  spaceId: string;
  senderConnectionId?: string;
  senderUserId?: string;
  message: OutgoingMessage;
};

type BusEvent = BroadcastEvent;
type SpaceOwner = {
  instanceId: string;
  publicUrl?: string;
  updatedAt: number;
};

export class RealtimeBus {
  private static instance: RealtimeBus;
  public readonly instanceId = randomUUID();
  private publisher?: Redis;
  private subscriber?: Redis;
  private handlers: ((event: BusEvent) => void)[] = [];
  private subscribedSpaces = new Set<string>();
  private ownedSpaces = new Set<string>();
  private ownerRefreshTimer?: NodeJS.Timeout;
  private readonly publicUrl = process.env.SFU_PUBLIC_URL || process.env.PUBLIC_WS_URL || process.env.VITE_APP_WS_URL;

  private constructor() {
    const busDisabled =
      process.env.REALTIME_BUS_ENABLED === "false" ||
      process.env.SFU_SPACE_AFFINITY === "off";

    if (busDisabled) {
      console.log("Realtime Redis pub/sub disabled for single-server mode.");
      return;
    }

    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
    if (!redisUrl) {
      console.log("Realtime Redis pub/sub disabled. Set REDIS_URL or UPSTASH_REDIS_URL to enable multi-instance signaling.");
      return;
    }

    this.publisher = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });
    this.subscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });

    this.publisher.on("error", (error) => console.warn("[Redis pub] error", error.message));
    this.subscriber.on("error", (error) => console.warn("[Redis sub] error", error.message));
    this.subscriber.on("message", (_channel, raw) => {
      try {
        const event = JSON.parse(raw) as BusEvent;
        if (event.instanceId === this.instanceId) return;
        this.handlers.forEach((handler) => handler(event));
      } catch (error) {
        console.warn("[Redis sub] failed to parse event", error instanceof Error ? error.message : error);
      }
    });

    void this.publisher.connect().then(() => {
      console.log("Realtime Redis publisher connected");
    }).catch((error) => console.warn("[Redis pub] connect failed", error.message));
    void this.subscriber.connect().then(() => {
      console.log("Realtime Redis subscriber connected");
    }).catch((error) => console.warn("[Redis sub] connect failed", error.message));

    this.ownerRefreshTimer = setInterval(() => {
      this.ownedSpaces.forEach((spaceId) => {
        void this.refreshSpaceOwner(spaceId);
      });
    }, 10_000);
  }

  static getInstance() {
    if (!this.instance) this.instance = new RealtimeBus();
    return this.instance;
  }

  public isEnabled() {
    return Boolean(this.publisher && this.subscriber);
  }

  public onEvent(handler: (event: BusEvent) => void) {
    this.handlers.push(handler);
  }

  public subscribeSpace(spaceId: string) {
    if (!this.subscriber || this.subscribedSpaces.has(spaceId)) return;
    this.subscribedSpaces.add(spaceId);
    void this.subscriber.subscribe(this.channel(spaceId)).catch((error) => {
      this.subscribedSpaces.delete(spaceId);
      console.warn("[Redis sub] subscribe failed", { spaceId, error: error.message });
    });
  }

  public async claimSpaceOwner(spaceId: string) {
    if (!this.publisher || process.env.SFU_SPACE_AFFINITY === "off") {
      return { ok: true, ownerInstanceId: this.instanceId, ownerPublicUrl: this.publicUrl, enabled: false };
    }

    const key = this.ownerKey(spaceId);
    try {
      const owner = this.ownerPayload();
      const result = await this.publisher.set(key, JSON.stringify(owner), "EX", 30, "NX");
      if (result === "OK") {
        this.ownedSpaces.add(spaceId);
        return { ok: true, ownerInstanceId: this.instanceId, ownerPublicUrl: this.publicUrl, enabled: true };
      }

      const currentOwner = await this.readSpaceOwner(spaceId);
      if (!currentOwner || currentOwner.instanceId === this.instanceId) {
        await this.refreshSpaceOwner(spaceId);
        this.ownedSpaces.add(spaceId);
        return { ok: true, ownerInstanceId: this.instanceId, ownerPublicUrl: this.publicUrl, enabled: true };
      }

      const mode = process.env.SFU_SPACE_AFFINITY || "strict";
      if (mode === "warn") {
        console.warn("[SFU] Space is owned by another instance, but SFU_SPACE_AFFINITY=warn allows join", {
          spaceId,
          ownerInstanceId: currentOwner.instanceId,
          instanceId: this.instanceId,
        });
        return { ok: true, ownerInstanceId: currentOwner.instanceId, ownerPublicUrl: currentOwner.publicUrl, enabled: true };
      }

      return { ok: false, ownerInstanceId: currentOwner.instanceId, ownerPublicUrl: currentOwner.publicUrl, enabled: true };
    } catch (error) {
      console.warn("[SFU] failed to claim space owner", error instanceof Error ? error.message : error);
      return { ok: true, ownerInstanceId: this.instanceId, ownerPublicUrl: this.publicUrl, enabled: false };
    }
  }

  public releaseSpaceOwner(spaceId: string) {
    if (!this.publisher || !this.ownedSpaces.has(spaceId)) return;
    this.ownedSpaces.delete(spaceId);
    const key = this.ownerKey(spaceId);
    void this.readSpaceOwner(spaceId).then((owner) => {
      if (owner?.instanceId === this.instanceId) return this.publisher?.del(key);
    }).catch((error) => console.warn("[SFU] failed to release space owner", error.message));
  }

  public publishBroadcast(spaceId: string, message: OutgoingMessage, sender?: { id?: string; userId?: string }) {
    if (!this.publisher) return;
    const event: BroadcastEvent = {
      kind: "broadcast",
      instanceId: this.instanceId,
      spaceId,
      senderConnectionId: sender?.id,
      senderUserId: sender?.userId,
      message,
    };
    void this.publisher.publish(this.channel(spaceId), JSON.stringify(event)).catch((error) => {
      console.warn("[Redis pub] publish failed", { spaceId, error: error.message });
    });
  }

  private channel(spaceId: string) {
    return `metaverse:space:${spaceId}`;
  }

  private ownerKey(spaceId: string) {
    return `metaverse:sfu-owner:${spaceId}`;
  }

  private async refreshSpaceOwner(spaceId: string) {
    if (!this.publisher) return;
    const key = this.ownerKey(spaceId);
    const owner = await this.readSpaceOwner(spaceId);
    if (owner?.instanceId === this.instanceId) {
      await this.publisher.set(key, JSON.stringify(this.ownerPayload()), "EX", 30);
      this.ownedSpaces.add(spaceId);
    }
  }

  private ownerPayload(): SpaceOwner {
    return {
      instanceId: this.instanceId,
      publicUrl: this.publicUrl,
      updatedAt: Date.now(),
    };
  }

  private async readSpaceOwner(spaceId: string): Promise<SpaceOwner | null> {
    if (!this.publisher) return null;
    const raw = await this.publisher.get(this.ownerKey(spaceId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SpaceOwner;
      if (typeof parsed?.instanceId === "string") return parsed;
    } catch {}
    return { instanceId: raw, updatedAt: Date.now() };
  }
}

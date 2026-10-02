import * as mediasoup from "mediasoup";
// @ts-ignore
import { Worker, Router, WebRtcTransport, Producer, Consumer, RtpCodecCapability } from "mediasoup/node/lib/types";

// Configuration for Mediasoup
const mediaCodecs: RtpCodecCapability[] = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
      "x-google-start-bitrate": 1000,
    },
  },
];

const rtcMinPort = Number(process.env.MEDIASOUP_RTC_MIN_PORT || 40000);
const rtcMaxPort = Number(process.env.MEDIASOUP_RTC_MAX_PORT || 49999);
const listenIp = process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0";
const announcedIp = process.env.MEDIASOUP_ANNOUNCED_IP || undefined;

export class MediasoupManager {
  private static instance: MediasoupManager;
  private worker?: Worker;
  private initPromise?: Promise<void>;
  private disabledReason?: string;
  private routers: Map<string, Router> = new Map();

  // Store transports, producers, and consumers by their ID
  public transports: Map<string, WebRtcTransport> = new Map();
  public producers: Map<string, Producer> = new Map();
  public consumers: Map<string, Consumer> = new Map();
  public producerMeta: Map<string, { spaceId: string; userId?: string; appData?: any }> = new Map();

  private constructor() {}

  public static getInstance(): MediasoupManager {
    if (!MediasoupManager.instance) {
      MediasoupManager.instance = new MediasoupManager();
    }
    return MediasoupManager.instance;
  }

  public async init() {
    if (this.initPromise) return this.initPromise;

    if (process.env.MEDIASOUP_ENABLED === "false") {
      this.disabledReason = "MEDIASOUP_ENABLED=false";
      console.warn(`Mediasoup disabled (${this.disabledReason})`);
      return;
    }

    this.initPromise = this.createWorker().catch((err) => {
      this.disabledReason = this.getStartupFailureMessage(err);

      if (process.env.MEDIASOUP_REQUIRED === "true") {
        throw err;
      }

      console.warn(`Mediasoup disabled: ${this.disabledReason}`);
      console.warn("Set MEDIASOUP_REQUIRED=true to fail fast when the worker cannot start.");
    });

    return this.initPromise;
  }

  public isAvailable() {
    return Boolean(this.worker) && !this.disabledReason;
  }

  public getUnavailableReason() {
    return this.disabledReason ?? "worker not initialized";
  }

  private async createWorker() {
    this.worker = await mediasoup.createWorker({
      logLevel: "warn",
      logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
      rtcMinPort,
      rtcMaxPort,
    });

    this.worker.on("died", () => {
      console.error("mediasoup worker died, exiting in 2 seconds... [pid:%d]", this.worker?.pid);
      setTimeout(() => process.exit(1), 2000);
    });
    console.log("Mediasoup worker created [pid:%d]", this.worker.pid);
    console.log("Mediasoup RTC config", {
      listenIp,
      announcedIp: announcedIp || null,
      rtcMinPort,
      rtcMaxPort,
    });
    if (process.env.NODE_ENV === "production" && !announcedIp) {
      console.warn("MEDIASOUP_ANNOUNCED_IP is not set. Remote browsers may receive private ICE candidates and media may not flow on AWS.");
    }
  }

  private getStartupFailureMessage(err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code = typeof err === "object" && err && "code" in err ? String((err as { code?: unknown }).code) : "";

    if (process.platform === "win32" && (code === "UNKNOWN" || message.includes("spawn UNKNOWN"))) {
      return "Windows blocked node_modules/mediasoup/worker/out/Release/mediasoup-worker.exe. Allow it in Application Control or run with MEDIASOUP_ENABLED=false for non-media dev.";
    }

    return message;
  }

  private assertReady() {
    if (!this.worker || this.disabledReason) {
      throw new Error(`Mediasoup unavailable: ${this.getUnavailableReason()}`);
    }
  }

  public async getRouter(spaceId: string): Promise<Router> {
    this.assertReady();
    if (this.routers.has(spaceId)) return this.routers.get(spaceId)!;

    const router = await this.worker!.createRouter({ mediaCodecs });
    this.routers.set(spaceId, router);
    return router;
  }

  public async createWebRtcTransport(spaceId: string): Promise<WebRtcTransport> {
    const router = await this.getRouter(spaceId);
    const transport = await router.createWebRtcTransport({
      listenIps: [
        {
          ip: listenIp,
          announcedIp,
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    console.log("Mediasoup transport created", {
      id: transport.id,
      spaceId,
      iceCandidates: transport.iceCandidates.map((candidate: any) => ({
        protocol: candidate.protocol,
        ip: candidate.ip,
        port: candidate.port,
        type: candidate.type,
      })),
    });
    transport.on("dtlsstatechange", (dtlsState: any) => {
      console.log("Mediasoup transport dtlsstatechange", { id: transport.id, dtlsState });
      if (dtlsState === "closed") transport.close();
    });
    transport.on("icestatechange", (iceState: any) => {
      console.log("Mediasoup transport icestatechange", { id: transport.id, iceState });
    });
    transport.on("routerclose", () => transport.close());

    this.transports.set(transport.id, transport);
    return transport;
  }

  public async connectTransport(transportId: string, dtlsParameters: any) {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error("Transport not found");
    await transport.connect({ dtlsParameters });
  }

  public async createProducer(transportId: string, kind: any, rtpParameters: any, meta: { spaceId: string; userId?: string; appData?: any }): Promise<Producer> {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error("Transport not found");
    const producer = await transport.produce({ kind, rtpParameters });
    this.producers.set(producer.id, producer);
    this.producerMeta.set(producer.id, meta);
    console.log("Mediasoup producer created", { producerId: producer.id, kind, spaceId: meta.spaceId, userId: meta.userId, appData: meta.appData });

    producer.on("transportclose", () => {
      this.producers.delete(producer.id);
      this.producerMeta.delete(producer.id);
      producer.close();
    });
    return producer;
  }

  public closeProducer(producerId: string) {
    const producer = this.producers.get(producerId);
    if (producer && !producer.closed) producer.close();
    this.producers.delete(producerId);
    this.producerMeta.delete(producerId);
  }

  public closeUserProducers(spaceId: string, userId?: string) {
    if (!userId) return [];
    const closed: string[] = [];
    for (const [producerId, meta] of this.producerMeta.entries()) {
      if (meta.spaceId === spaceId && meta.userId === userId) {
        this.closeProducer(producerId);
        closed.push(producerId);
      }
    }
    return closed;
  }

  public getProducersForSpace(spaceId: string, exceptUserId?: string) {
    return Array.from(this.producerMeta.entries())
      .filter(([producerId, meta]) => meta.spaceId === spaceId && meta.userId !== exceptUserId && this.producers.has(producerId))
      .map(([producerId, meta]) => ({ producerId, userId: meta.userId, appData: meta.appData }));
  }

  public async createConsumer(transportId: string, producerId: string, rtpCapabilities: any, spaceId: string): Promise<Consumer> {
    const router = await this.getRouter(spaceId);
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error("Transport not found");

    if (!router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error("Cannot consume");
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: false,
    });
    this.consumers.set(consumer.id, consumer);
    console.log("Mediasoup consumer created", { consumerId: consumer.id, producerId, kind: consumer.kind, spaceId });

    consumer.on("transportclose", () => consumer.close());
    consumer.on("producerclose", () => consumer.close());
    return consumer;
  }
}

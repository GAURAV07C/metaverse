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

export class MediasoupManager {
  private static instance: MediasoupManager;
  private worker?: Worker;
  private routers: Map<string, Router> = new Map();

  // Store transports, producers, and consumers by their ID
  public transports: Map<string, WebRtcTransport> = new Map();
  public producers: Map<string, Producer> = new Map();
  public consumers: Map<string, Consumer> = new Map();

  private constructor() {}

  public static getInstance(): MediasoupManager {
    if (!MediasoupManager.instance) {
      MediasoupManager.instance = new MediasoupManager();
    }
    return MediasoupManager.instance;
  }

  public async init() {
    this.worker = await mediasoup.createWorker({
      logLevel: "warn",
      logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    });

    this.worker.on("died", () => {
      console.error("mediasoup worker died, exiting in 2 seconds... [pid:%d]", this.worker?.pid);
      setTimeout(() => process.exit(1), 2000);
    });
    console.log("Mediasoup worker created [pid:%d]", this.worker.pid);
  }

  public async getRouter(spaceId: string): Promise<Router> {
    if (!this.worker) throw new Error("Worker not initialized");
    if (this.routers.has(spaceId)) return this.routers.get(spaceId)!;

    const router = await this.worker.createRouter({ mediaCodecs });
    this.routers.set(spaceId, router);
    return router;
  }

  public async createWebRtcTransport(spaceId: string): Promise<WebRtcTransport> {
    const router = await this.getRouter(spaceId);
    const transport = await router.createWebRtcTransport({
      listenIps: [
        {
          ip: process.env.MEDIASOUP_LISTEN_IP || "127.0.0.1",
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || undefined,
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    transport.on("dtlsstatechange", (dtlsState: any) => {
      if (dtlsState === "closed") transport.close();
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

  public async createProducer(transportId: string, kind: any, rtpParameters: any): Promise<Producer> {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error("Transport not found");
    const producer = await transport.produce({ kind, rtpParameters });
    this.producers.set(producer.id, producer);

    producer.on("transportclose", () => producer.close());
    return producer;
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
      paused: true,
    });
    this.consumers.set(consumer.id, consumer);

    consumer.on("transportclose", () => consumer.close());
    consumer.on("producerclose", () => consumer.close());
    return consumer;
  }
}

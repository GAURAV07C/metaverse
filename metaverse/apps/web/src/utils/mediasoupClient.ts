import { Device } from 'mediasoup-client';
import type { types } from 'mediasoup-client';
import { WsClient } from './ws';

type Transport = types.Transport;
type Producer = types.Producer;
type Consumer = types.Consumer;
type VideoQualityPreference = 'auto' | 'low' | 'standard' | 'high';

function readVideoQuality(): VideoQualityPreference {
  try {
    const raw = JSON.parse(localStorage.getItem('metaverse_device_preferences') || '{}');
    return ['auto', 'low', 'standard', 'high'].includes(raw.videoQuality) ? raw.videoQuality : 'auto';
  } catch {
    return 'auto';
  }
}

function videoBitratePreset(type: string) {
  if (type === 'screen') return { maxBitrate: 1_400_000, startBitrate: 1000, scaleResolutionDownBy: 1 };
  const presets = {
    low: { maxBitrate: 220_000, startBitrate: 220, scaleResolutionDownBy: 1.8 },
    standard: { maxBitrate: 450_000, startBitrate: 450, scaleResolutionDownBy: 1.25 },
    high: { maxBitrate: 900_000, startBitrate: 700, scaleResolutionDownBy: 1 },
    auto: { maxBitrate: 450_000, startBitrate: 450, scaleResolutionDownBy: 1.25 },
  } satisfies Record<VideoQualityPreference, { maxBitrate: number; startBitrate: number; scaleResolutionDownBy: number }>;
  return presets[readVideoQuality()];
}

export interface MediaStatsSummary {
  bytesSent?: number;
  bytesReceived?: number;
  packetsSent?: number;
  packetsReceived?: number;
  packetsLost?: number;
  jitter?: number;
  roundTripTime?: number;
  framesDecoded?: number;
  framesEncoded?: number;
  framesPerSecond?: number;
  frameWidth?: number;
  frameHeight?: number;
}

export interface MediaDiagnostics {
  hasSendTransport: boolean;
  hasRecvTransport: boolean;
  pendingRemoteProducers: number;
  producers: Array<{
    id: string;
    type: string;
    kind?: string;
    closed?: boolean;
    trackState?: MediaStreamTrackState;
    stats: MediaStatsSummary;
  }>;
  consumers: Array<{
    id: string;
    producerId: string;
    type?: string;
    kind?: string;
    closed?: boolean;
    paused?: boolean;
    trackState?: MediaStreamTrackState;
    stats: MediaStatsSummary;
  }>;
  serverLifecycle?: {
    createdAt: string;
    transportsCreated: number;
    transportsClosed: number;
    producersCreated: number;
    producersClosed: number;
    consumersCreated: number;
    consumersClosed: number;
    liveTransports: number;
    liveProducers: number;
    liveConsumers: number;
    available: boolean;
    unavailableReason?: string;
    rtcMinPort: number;
    rtcMaxPort: number;
    listenIp: string;
    announcedIp?: string | null;
    networkWarnings?: string[];
  };
}

export class MediasoupClient {
  private device: Device;
  private ws: WsClient;
  private sendTransport?: Transport;
  private recvTransport?: Transport;

  private producers: Map<string, Producer> = new Map();
  private producerIdsByType: Map<string, string> = new Map();
  private consumers: Map<string, Consumer> = new Map();
  private producerMeta: Map<string, { userId: string; type?: string }> = new Map();
  private pendingRemoteProducers: { producerId: string; userId: string; appData?: any }[] = [];
  private initPromise?: Promise<void>;

  private pendingRequests: Map<string, { resolve: (val: any) => void; reject: (err: Error) => void; responseType: string }> = new Map();

  public onNewConsumer?: (consumer: Consumer, userId: string, appData?: any) => void;

  constructor(ws: WsClient) {
    this.device = new Device();
    this.ws = ws;

    this.ws.onMessage(async (msg) => {
      switch (msg.type) {
        case 'webrtc-router-rtp-capabilities':
          this.resolveRequest('webrtc-router-rtp-capabilities', msg.payload);
          break;
        case 'webrtc-transport-created':
          this.resolveRequest('webrtc-transport-created', msg.payload);
          break;
        case 'webrtc-transport-connected':
          this.resolveRequest('webrtc-transport-connected', null);
          break;
        case 'webrtc-produced':
          this.resolveRequest('webrtc-produced', msg.payload);
          break;
        case 'webrtc-consumed':
          this.resolveRequest('webrtc-consumed', msg.payload);
          break;
        case 'webrtc-consumer-resumed':
          this.resolveRequest('webrtc-consumer-resumed', msg.payload);
          break;
        case 'webrtc-media-lifecycle':
          this.resolveRequest('webrtc-media-lifecycle', msg.payload);
          break;
        case 'webrtc-error':
          this.rejectPendingRequests(new Error(msg.payload.message), msg.payload.requestId);
          break;
        case 'new-producer':
          // Another user started producing, we should consume it
          this.producerMeta.set(msg.payload.producerId, { userId: msg.payload.userId, type: msg.payload.appData?.type });
          await this.consumeOrQueue(msg.payload.producerId, msg.payload.userId, msg.payload.appData);
          break;
        case 'producer-closed':
          this.closeConsumerByProducerId(msg.payload.producerId);
          break;
      }
    });
  }

  private resolveRequest(type: string, data: any) {
    const requestId = typeof data?.requestId === 'string' ? data.requestId : '';
    const request = requestId ? this.pendingRequests.get(requestId) : Array.from(this.pendingRequests.values()).find(item => item.responseType === type);
    if (request) {
      request.resolve(data);
      if (requestId) this.pendingRequests.delete(requestId);
      else {
        const entry = Array.from(this.pendingRequests.entries()).find(([, item]) => item === request);
        if (entry) this.pendingRequests.delete(entry[0]);
      }
    }
  }

  private rejectPendingRequests(error: Error, requestId?: string) {
    if (requestId) {
      const request = this.pendingRequests.get(requestId);
      if (request) {
        request.reject(error);
        this.pendingRequests.delete(requestId);
      }
      return;
    }
    this.pendingRequests.forEach((request) => request.reject(error));
    this.pendingRequests.clear();
  }

  private async request(type: string, payload?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let responseType = type.replace('webrtc-', 'webrtc-').replace('-create', '-created').replace('-get', '-');
      if (type === 'webrtc-get-router-rtp-capabilities') {
        responseType = 'webrtc-router-rtp-capabilities';
      } else if (type === 'webrtc-create-transport') {
        responseType = 'webrtc-transport-created';
      } else if (type === 'webrtc-connect-transport') {
        responseType = 'webrtc-transport-connected';
      } else if (type === 'webrtc-produce') {
        responseType = 'webrtc-produced';
      } else if (type === 'webrtc-consume') {
        responseType = 'webrtc-consumed';
      } else if (type === 'webrtc-resume-consumer') {
        responseType = 'webrtc-consumer-resumed';
      } else if (type === 'webrtc-get-media-lifecycle') {
        responseType = 'webrtc-media-lifecycle';
      }

      this.pendingRequests.set(requestId, { resolve, reject, responseType });
      window.setTimeout(() => {
        const pending = this.pendingRequests.get(requestId);
        if (!pending) return;
        this.pendingRequests.delete(requestId);
        pending.reject(new Error(`${type} timed out`));
      }, 12000);

      this.ws.send({ type, payload: { ...(payload || {}), requestId } });
    });
  }

  public async init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.initOnce();
    return this.initPromise;
  }

  private async initOnce() {
    try {
      const { rtpCapabilities } = await this.request('webrtc-get-router-rtp-capabilities');
      if (!this.device.loaded) {
        await this.device.load({ routerRtpCapabilities: rtpCapabilities });
      }

      await this.initSendTransport();
      await this.initRecvTransport();
      await this.flushPendingRemoteProducers();
    } catch (err) {
      console.error('Mediasoup init error', err);
      this.initPromise = undefined;
      throw err;
    }
  }

  private async initSendTransport() {
    const params = await this.request('webrtc-create-transport');
    this.sendTransport = this.device.createSendTransport(params);
    this.sendTransport.on('connectionstatechange', (state: string) => {
      console.log('Mediasoup send transport state', state);
    });

    this.sendTransport.on('connect', async ({ dtlsParameters }: { dtlsParameters: types.DtlsParameters }, callback: () => void, errback: (error: Error) => void) => {
      try {
        await this.request('webrtc-connect-transport', {
          transportId: this.sendTransport!.id,
          dtlsParameters,
        });
        callback();
      } catch (err) {
        errback(err as Error);
      }
    });

    this.sendTransport.on('produce', async (
      parameters: { kind: string; rtpParameters: unknown; appData: unknown },
      callback: (data: { id: string }) => void,
      errback: (error: Error) => void,
    ) => {
      try {
        const { id } = await this.request('webrtc-produce', {
          transportId: this.sendTransport!.id,
          kind: parameters.kind,
          rtpParameters: parameters.rtpParameters,
          appData: parameters.appData,
        });
        callback({ id });
      } catch (err) {
        errback(err as Error);
      }
    });
  }

  private async initRecvTransport() {
    const params = await this.request('webrtc-create-transport');
    this.recvTransport = this.device.createRecvTransport(params);
    this.recvTransport.on('connectionstatechange', (state: string) => {
      console.log('Mediasoup recv transport state', state);
    });

    this.recvTransport.on('connect', async ({ dtlsParameters }: { dtlsParameters: types.DtlsParameters }, callback: () => void, errback: (error: Error) => void) => {
      try {
        await this.request('webrtc-connect-transport', {
          transportId: this.recvTransport!.id,
          dtlsParameters,
        });
        callback();
      } catch (err) {
        errback(err as Error);
      }
    });
  }

  public async produce(track: MediaStreamTrack, userId: string, appData?: Record<string, unknown>) {
    if (!this.sendTransport) throw new Error('Send transport not initialized');
    const type = typeof appData?.type === 'string' ? appData.type : track.kind;
    const producerOptions: types.ProducerOptions = {
      track,
      appData: { userId, ...appData },
    };
    if (track.kind === 'video') {
      const bitrate = videoBitratePreset(type);
      producerOptions.encodings = [{
        maxBitrate: bitrate.maxBitrate,
        scaleResolutionDownBy: bitrate.scaleResolutionDownBy,
      }];
      producerOptions.codecOptions = {
        videoGoogleStartBitrate: bitrate.startBitrate,
      };
    }
    const producer = await this.sendTransport.produce(producerOptions);
    console.log('Mediasoup local producer created', { id: producer.id, kind: track.kind, type });
    this.producers.set(type, producer);
    this.producerIdsByType.set(type, producer.id);
    return producer;
  }

  public async replaceProducerTrack(type: 'audio' | 'camera' | 'screen' | string, track: MediaStreamTrack, userId: string, appData?: Record<string, unknown>) {
    const producer = this.producers.get(type);
    if (!producer || producer.closed) {
      return this.produce(track, userId, { type, ...appData });
    }
    await producer.replaceTrack({ track });
    return producer;
  }

  public hasProducer(type: 'audio' | 'camera' | 'screen' | string) {
    const producer = this.producers.get(type);
    return Boolean(producer && !producer.closed);
  }

  public async stopProduce(kind: 'audio' | 'video' | 'screen' | string) {
    const producer = this.producers.get(kind);
    if (producer) {
      const producerId = this.producerIdsByType.get(kind) || producer.id;
      producer.close();
      this.producers.delete(kind);
      this.producerIdsByType.delete(kind);
      this.ws.send({ type: 'webrtc-stop-producer', payload: { producerId } });
    }
  }

  private summarizeStats(stats: RTCStatsReport): MediaStatsSummary {
    const summary: MediaStatsSummary = {};
    stats.forEach((entry) => {
      const report = entry as RTCStats & Record<string, number | string | boolean | undefined>;
      if (report.type === 'outbound-rtp' || report.type === 'inbound-rtp' || report.type === 'remote-inbound-rtp') {
        summary.bytesSent = typeof report.bytesSent === 'number' ? report.bytesSent : summary.bytesSent;
        summary.bytesReceived = typeof report.bytesReceived === 'number' ? report.bytesReceived : summary.bytesReceived;
        summary.packetsSent = typeof report.packetsSent === 'number' ? report.packetsSent : summary.packetsSent;
        summary.packetsReceived = typeof report.packetsReceived === 'number' ? report.packetsReceived : summary.packetsReceived;
        summary.packetsLost = typeof report.packetsLost === 'number' ? report.packetsLost : summary.packetsLost;
        summary.jitter = typeof report.jitter === 'number' ? report.jitter : summary.jitter;
        summary.roundTripTime = typeof report.roundTripTime === 'number' ? report.roundTripTime : summary.roundTripTime;
        summary.framesDecoded = typeof report.framesDecoded === 'number' ? report.framesDecoded : summary.framesDecoded;
        summary.framesEncoded = typeof report.framesEncoded === 'number' ? report.framesEncoded : summary.framesEncoded;
        summary.framesPerSecond = typeof report.framesPerSecond === 'number' ? report.framesPerSecond : summary.framesPerSecond;
        summary.frameWidth = typeof report.frameWidth === 'number' ? report.frameWidth : summary.frameWidth;
        summary.frameHeight = typeof report.frameHeight === 'number' ? report.frameHeight : summary.frameHeight;
      }
    });
    return summary;
  }

  public async getDiagnostics(): Promise<MediaDiagnostics> {
    let serverLifecycle: MediaDiagnostics['serverLifecycle'] | undefined;
    try {
      const response = await this.request('webrtc-get-media-lifecycle');
      serverLifecycle = response?.lifecycle;
    } catch (error) {
      console.warn('Unable to read server media lifecycle', error);
    }

    const producers = await Promise.all(Array.from(this.producers.entries()).map(async ([type, producer]) => ({
      id: producer.id,
      type,
      kind: producer.track?.kind,
      closed: producer.closed,
      trackState: producer.track?.readyState,
      stats: this.summarizeStats(await producer.getStats()),
    })));

    const consumers = await Promise.all(Array.from(this.consumers.values()).map(async (consumer) => {
      const meta = this.producerMeta.get(consumer.producerId);
      return {
        id: consumer.id,
        producerId: consumer.producerId,
        type: meta?.type,
        kind: consumer.kind,
        closed: consumer.closed,
        paused: consumer.paused,
        trackState: consumer.track?.readyState,
        stats: this.summarizeStats(await consumer.getStats()),
      };
    }));

    return {
      hasSendTransport: Boolean(this.sendTransport),
      hasRecvTransport: Boolean(this.recvTransport),
      pendingRemoteProducers: this.pendingRemoteProducers.length,
      producers,
      consumers,
      serverLifecycle,
    };
  }

  private async consumeOrQueue(producerId: string, userId: string, appData?: any) {
    if (!this.recvTransport || !this.device.loaded) {
      if (!this.pendingRemoteProducers.some(item => item.producerId === producerId)) {
        this.pendingRemoteProducers.push({ producerId, userId, appData });
      }
      return;
    }
    await this.consume(producerId, userId, appData);
  }

  private async flushPendingRemoteProducers() {
    const pending = [...this.pendingRemoteProducers];
    this.pendingRemoteProducers = [];
    for (const item of pending) {
      await this.consume(item.producerId, item.userId, item.appData);
    }
  }

  private async consume(producerId: string, userId: string, appData?: any) {
    if (!this.recvTransport) throw new Error('Recv transport not initialized');
    if (Array.from(this.consumers.values()).some(consumer => consumer.producerId === producerId && !consumer.closed)) return;
    
    const params = await this.request('webrtc-consume', {
      producerId,
      transportId: this.recvTransport.id,
      rtpCapabilities: this.device.rtpCapabilities,
    });

    const consumer = await this.recvTransport.consume({
      id: params.id,
      producerId: params.producerId,
      kind: params.kind,
      rtpParameters: params.rtpParameters,
    });

    this.consumers.set(consumer.id, consumer);
    console.log('Mediasoup remote consumer created', { id: consumer.id, producerId, kind: consumer.kind, userId, appData });

    if (this.onNewConsumer) {
      this.onNewConsumer(consumer, userId, this.producerMeta.get(producerId) || appData);
    }

    await this.request('webrtc-resume-consumer', { consumerId: consumer.id });
  }

  public getConsumersByUserId(userId: string): Consumer[] {
      return Array.from(this.consumers.values()).filter(c => c.appData?.userId === userId);
  }

  public closeConsumersByUserId(userId: string) {
    const producersToClose = Array.from(this.producerMeta.entries())
      .filter(([_, meta]) => meta.userId === userId)
      .map(([producerId, _]) => producerId);

    Array.from(this.consumers.values()).forEach(consumer => {
      if (producersToClose.includes(consumer.producerId)) {
        consumer.close();
        this.consumers.delete(consumer.id);
      }
    });
  }

  private closeConsumerByProducerId(producerId: string) {
    Array.from(this.consumers.values()).forEach(consumer => {
      if (consumer.producerId === producerId) {
        consumer.close();
        this.consumers.delete(consumer.id);
      }
    });
    this.producerMeta.delete(producerId);
    this.pendingRemoteProducers = this.pendingRemoteProducers.filter(item => item.producerId !== producerId);
  }
}

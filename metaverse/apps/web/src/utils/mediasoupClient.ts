import { Device } from 'mediasoup-client';
import type { types } from 'mediasoup-client';
import { WsClient } from './ws';

type Transport = types.Transport;
type Producer = types.Producer;
type Consumer = types.Consumer;

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
      const isScreen = type === 'screen';
      producerOptions.encodings = [{
        maxBitrate: isScreen ? 1_400_000 : 450_000,
        scaleResolutionDownBy: isScreen ? 1 : 1.25,
      }];
      producerOptions.codecOptions = {
        videoGoogleStartBitrate: isScreen ? 1000 : 450,
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

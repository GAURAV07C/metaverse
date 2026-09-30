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
  private consumers: Map<string, Consumer> = new Map();
  private producerMeta: Map<string, { userId: string; type?: string }> = new Map();
  private initPromise?: Promise<void>;

  private pendingRequests: Map<string, { resolve: (val: any) => void; reject: (err: Error) => void }> = new Map();

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
          this.rejectPendingRequests(new Error(msg.payload.message));
          break;
        case 'new-producer':
          // Another user started producing, we should consume it
          this.producerMeta.set(msg.payload.producerId, { userId: msg.payload.userId, type: msg.payload.appData?.type });
          await this.consume(msg.payload.producerId, msg.payload.userId);
          break;
      }
    });
  }

  private resolveRequest(type: string, data: any) {
    const request = this.pendingRequests.get(type);
    if (request) {
      request.resolve(data);
      this.pendingRequests.delete(type);
    }
  }

  private rejectPendingRequests(error: Error) {
    this.pendingRequests.forEach((request) => request.reject(error));
    this.pendingRequests.clear();
  }

  private async request(type: string, payload?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = { resolve, reject };
      // For simplicity, we assume one request of a type at a time during setup
      this.pendingRequests.set(type.replace('webrtc-', 'webrtc-').replace('-create', '-created').replace('-get', '-'), request);
      
      // Override exact mappings
      if (type === 'webrtc-get-router-rtp-capabilities') {
        this.pendingRequests.set('webrtc-router-rtp-capabilities', request);
      } else if (type === 'webrtc-create-transport') {
        this.pendingRequests.set('webrtc-transport-created', request);
      } else if (type === 'webrtc-connect-transport') {
        this.pendingRequests.set('webrtc-transport-connected', request);
      } else if (type === 'webrtc-produce') {
        this.pendingRequests.set('webrtc-produced', request);
      } else if (type === 'webrtc-consume') {
        this.pendingRequests.set('webrtc-consumed', request);
      }
      
      this.ws.send({ type, payload });
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
    } catch (err) {
      console.error('Mediasoup init error', err);
      this.initPromise = undefined;
    }
  }

  private async initSendTransport() {
    const params = await this.request('webrtc-create-transport');
    this.sendTransport = this.device.createSendTransport(params);

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
    const producer = await this.sendTransport.produce({ track, appData: { userId, ...appData } });
    this.producers.set(type, producer);
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
      producer.close();
      this.producers.delete(kind);
      // NOTE: Should also notify server to close the producer to save resources
    }
  }

  private async consume(producerId: string, userId: string) {
    if (!this.recvTransport) throw new Error('Recv transport not initialized');
    
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

    if (this.onNewConsumer) {
      this.onNewConsumer(consumer, userId, this.producerMeta.get(producerId));
    }
  }

  public getConsumersByUserId(userId: string): Consumer[] {
      return Array.from(this.consumers.values()).filter(c => c.appData?.userId === userId);
  }
}

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

  private pendingRequests: Map<string, (val: any) => void> = new Map();

  public onNewConsumer?: (consumer: Consumer, userId: string) => void;

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
        case 'new-producer':
          // Another user started producing, we should consume it
          await this.consume(msg.payload.producerId, msg.payload.userId);
          break;
      }
    });
  }

  private resolveRequest(type: string, data: any) {
    const resolver = this.pendingRequests.get(type);
    if (resolver) {
      resolver(data);
      this.pendingRequests.delete(type);
    }
  }

  private async request(type: string, payload?: any): Promise<any> {
    return new Promise((resolve) => {
      // For simplicity, we assume one request of a type at a time during setup
      this.pendingRequests.set(type.replace('webrtc-', 'webrtc-').replace('-create', '-created').replace('-get', '-'), resolve);
      
      // Override exact mappings
      if (type === 'webrtc-get-router-rtp-capabilities') {
        this.pendingRequests.set('webrtc-router-rtp-capabilities', resolve);
      } else if (type === 'webrtc-create-transport') {
        this.pendingRequests.set('webrtc-transport-created', resolve);
      } else if (type === 'webrtc-connect-transport') {
        this.pendingRequests.set('webrtc-transport-connected', resolve);
      } else if (type === 'webrtc-produce') {
        this.pendingRequests.set('webrtc-produced', resolve);
      } else if (type === 'webrtc-consume') {
        this.pendingRequests.set('webrtc-consumed', resolve);
      }
      
      this.ws.send({ type, payload });
    });
  }

  public async init() {
    try {
      const { rtpCapabilities } = await this.request('webrtc-get-router-rtp-capabilities');
      await this.device.load({ routerRtpCapabilities: rtpCapabilities });

      await this.initSendTransport();
      await this.initRecvTransport();
    } catch (err) {
      console.error('Mediasoup init error', err);
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

  public async produce(track: MediaStreamTrack, userId: string) {
    if (!this.sendTransport) throw new Error('Send transport not initialized');
    const producer = await this.sendTransport.produce({ track, appData: { userId } });
    this.producers.set(track.kind, producer);
    return producer;
  }

  public async stopProduce(kind: 'audio' | 'video') {
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
      this.onNewConsumer(consumer, userId);
    }
  }

  public getConsumersByUserId(userId: string): Consumer[] {
      return Array.from(this.consumers.values()).filter(c => c.appData?.userId === userId);
  }
}

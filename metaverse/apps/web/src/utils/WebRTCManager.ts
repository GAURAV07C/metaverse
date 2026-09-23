import * as mediasoupClient from "mediasoup-client";
import { WsClient } from "./ws";

export class WebRTCManager {
  private device: mediasoupClient.Device;
  private sendTransport?: mediasoupClient.types.Transport;
  private recvTransport?: mediasoupClient.types.Transport;
  private ws: WsClient;
  private localStream: MediaStream | null = null;

  public producers: Map<string, mediasoupClient.types.Producer> = new Map();
  public consumers: Map<string, mediasoupClient.types.Consumer> = new Map();

  constructor(ws: WsClient) {
    this.ws = ws;
    this.device = new mediasoupClient.Device();
  }

  private sendRequest(type: string, payload: any, responseType: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const unsub = this.ws.onMessage((msg: any) => {
        if (msg.type === responseType) {
          unsub();
          resolve(msg.payload);
        }
      });
      this.ws.send({ type, payload });
      // Optional timeout
      setTimeout(() => { unsub(); reject(new Error("Timeout")); }, 5000);
    });
  }

  public async init() {
    // 1. Get router RTP capabilities from server
    const rtpCaps = await this.sendRequest("webrtc-get-router-rtp-capabilities", {}, "webrtc-router-rtp-capabilities");
    await this.device.load({ routerRtpCapabilities: rtpCaps.rtpCapabilities });

    // 2. Create send transport
    const sendTransportInfo = await this.sendRequest("webrtc-create-transport", {}, "webrtc-transport-created");
    this.sendTransport = this.device.createSendTransport(sendTransportInfo);

    this.sendTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.sendRequest("webrtc-connect-transport", {
          transportId: this.sendTransport!.id,
          dtlsParameters,
        }, "webrtc-transport-connected");
        callback();
      } catch (err: any) { errback(err); }
    });

    this.sendTransport.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        const res = await this.sendRequest("webrtc-produce", {
          transportId: this.sendTransport!.id,
          kind,
          rtpParameters,
          appData,
        }, "webrtc-produced");
        callback({ id: res.id });
      } catch (err: any) { errback(err); }
    });

    // 3. Create recv transport
    const recvTransportInfo = await this.sendRequest("webrtc-create-transport", {}, "webrtc-transport-created");
    this.recvTransport = this.device.createRecvTransport(recvTransportInfo);

    this.recvTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.sendRequest("webrtc-connect-transport", {
          transportId: this.recvTransport!.id,
          dtlsParameters,
        }, "webrtc-transport-connected");
        callback();
      } catch (err: any) { errback(err); }
    });
  }

  public async startLocalVideo(): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    
    // Produce video and audio
    const videoTrack = this.localStream.getVideoTracks()[0];
    const audioTrack = this.localStream.getAudioTracks()[0];

    if (videoTrack) {
      const videoProducer = await this.sendTransport!.produce({ track: videoTrack, appData: { type: 'camera' } });
      this.producers.set(videoProducer.id, videoProducer);
    }
    if (audioTrack) {
      const audioProducer = await this.sendTransport!.produce({ track: audioTrack, appData: { type: 'camera' } });
      this.producers.set(audioProducer.id, audioProducer);
    }
    
    return this.localStream;
  }

  public async startScreenShare(): Promise<MediaStream> {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    
    const videoTrack = screenStream.getVideoTracks()[0];
    const audioTrack = screenStream.getAudioTracks()[0];

    if (videoTrack) {
      const videoProducer = await this.sendTransport!.produce({ track: videoTrack, appData: { type: 'screen' } });
      this.producers.set(videoProducer.id, videoProducer);
    }
    if (audioTrack) {
      const audioProducer = await this.sendTransport!.produce({ track: audioTrack, appData: { type: 'screen' } });
      this.producers.set(audioProducer.id, audioProducer);
    }
    
    return screenStream;
  }

  public async consume(producerId: string): Promise<MediaStreamTrack> {
    const { rtpCapabilities } = this.device;
    const res = await this.sendRequest("webrtc-consume", {
      transportId: this.recvTransport!.id,
      producerId,
      rtpCapabilities,
    }, "webrtc-consumed");

    const consumer = await this.recvTransport!.consume({
      id: res.id,
      producerId: res.producerId,
      kind: res.kind,
      rtpParameters: res.rtpParameters,
    });

    this.consumers.set(consumer.id, consumer);
    return consumer.track;
  }
}

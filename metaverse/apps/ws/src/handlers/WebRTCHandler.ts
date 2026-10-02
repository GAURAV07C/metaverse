import { MediasoupManager } from "../MediasoupManager";
import { RoomManager } from "../RoomManager";
import { User } from "../User";

export class WebRTCHandler {
  private static getRequestId(parsedData: any) {
    return typeof parsedData?.payload?.requestId === "string" ? parsedData.payload.requestId : undefined;
  }

  static async handleGetRouterRtpCapabilities(user: User, parsedData?: any) {
    await this.handle(user, parsedData, async () => {
      if (!user.spaceId) return;
      const router = await MediasoupManager.getInstance().getRouter(user.spaceId);
      user.send({
        type: "webrtc-router-rtp-capabilities",
        payload: { rtpCapabilities: router.rtpCapabilities, requestId: this.getRequestId(parsedData) },
      });
    });
  }

  static async handleCreateTransport(user: User, parsedData?: any) {
    await this.handle(user, parsedData, async () => {
      if (!user.spaceId) return;
      const transport = await MediasoupManager.getInstance().createWebRtcTransport(user.spaceId);
      user.send({
        type: "webrtc-transport-created",
        payload: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
          requestId: this.getRequestId(parsedData),
        },
      });
    });
  }

  static async handleConnectTransport(user: User, parsedData: any) {
    await this.handle(user, parsedData, async () => {
      const { transportId, dtlsParameters } = parsedData.payload;
      await MediasoupManager.getInstance().connectTransport(transportId, dtlsParameters);
      user.send({ type: "webrtc-transport-connected", payload: { requestId: this.getRequestId(parsedData) } });
    });
  }

  static async handleProduce(user: User, parsedData: any) {
    await this.handle(user, parsedData, async () => {
      if (!user.spaceId) return;
      const { transportId, kind, rtpParameters, appData } = parsedData.payload;
      const producer = await MediasoupManager.getInstance().createProducer(transportId, kind, rtpParameters, {
        spaceId: user.spaceId,
        userId: user.userId,
        appData,
      });
      user.send({
        type: "webrtc-produced",
        payload: { id: producer.id, requestId: this.getRequestId(parsedData) },
      });

      RoomManager.getInstance().broadcast({
        type: "new-producer",
        payload: {
          producerId: producer.id,
          userId: user.userId,
          appData,
        }
      }, user, user.spaceId);
    });
  }

  static async handleStopProducer(user: User, parsedData: any) {
    await this.handle(user, parsedData, async () => {
      if (!user.spaceId) return;
      const producerId = typeof parsedData?.payload?.producerId === "string" ? parsedData.payload.producerId : "";
      if (!producerId) return;

      const manager = MediasoupManager.getInstance();
      const meta = manager.producerMeta.get(producerId);
      if (!meta || meta.spaceId !== user.spaceId || meta.userId !== user.userId) return;

      manager.closeProducer(producerId);
      RoomManager.getInstance().broadcast({
        type: "producer-closed",
        payload: {
          producerId,
          userId: user.userId,
          appData: meta.appData,
        },
      }, user, user.spaceId);
    });
  }

  static async handleConsume(user: User, parsedData: any) {
    await this.handle(user, parsedData, async () => {
      const { transportId, producerId, rtpCapabilities } = parsedData.payload;
      if (!user.spaceId) return;
      const consumer = await MediasoupManager.getInstance().createConsumer(transportId, producerId, rtpCapabilities, user.spaceId);
      user.send({
        type: "webrtc-consumed",
        payload: {
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          requestId: this.getRequestId(parsedData),
        },
      });
    });
  }

  private static async handle(user: User, parsedData: any, action: () => Promise<void>) {
    try {
      await action();
    } catch (err) {
      const message = err instanceof Error ? err.message : "WebRTC request failed";
      console.warn(`WebRTC request failed: ${message}`);
      user.send({
        type: "webrtc-error",
        payload: { message, requestId: this.getRequestId(parsedData) },
      });
    }
  }
}

import { MediasoupManager } from "../MediasoupManager";
import { RoomManager } from "../RoomManager";
import { User } from "../User";

export class WebRTCHandler {
  static async handleGetRouterRtpCapabilities(user: User) {
    await this.handle(user, async () => {
      if (!user.spaceId) return;
      const router = await MediasoupManager.getInstance().getRouter(user.spaceId);
      user.send({
        type: "webrtc-router-rtp-capabilities",
        payload: { rtpCapabilities: router.rtpCapabilities },
      });
    });
  }

  static async handleCreateTransport(user: User) {
    await this.handle(user, async () => {
      if (!user.spaceId) return;
      const transport = await MediasoupManager.getInstance().createWebRtcTransport(user.spaceId);
      user.send({
        type: "webrtc-transport-created",
        payload: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        },
      });
    });
  }

  static async handleConnectTransport(user: User, parsedData: any) {
    await this.handle(user, async () => {
      const { transportId, dtlsParameters } = parsedData.payload;
      await MediasoupManager.getInstance().connectTransport(transportId, dtlsParameters);
      user.send({ type: "webrtc-transport-connected" });
    });
  }

  static async handleProduce(user: User, parsedData: any) {
    await this.handle(user, async () => {
      if (!user.spaceId) return;
      const { transportId, kind, rtpParameters, appData } = parsedData.payload;
      const producer = await MediasoupManager.getInstance().createProducer(transportId, kind, rtpParameters);
      user.send({
        type: "webrtc-produced",
        payload: { id: producer.id },
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

  static async handleConsume(user: User, parsedData: any) {
    await this.handle(user, async () => {
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
        },
      });
    });
  }

  private static async handle(user: User, action: () => Promise<void>) {
    try {
      await action();
    } catch (err) {
      const message = err instanceof Error ? err.message : "WebRTC request failed";
      console.warn(`WebRTC request failed: ${message}`);
      user.send({
        type: "webrtc-error",
        payload: { message },
      });
    }
  }
}

import { RoomManager } from "../RoomManager";
import { User } from "../User";

export class ChatHandler {
  static handleMessage(user: User, parsedData: any) {
    if (!user.spaceId) return;
    const message = typeof parsedData?.payload?.message === "string" ? parsedData.payload.message.trim() : "";
    if (!message || message.length > 500) return;
    
    RoomManager.getInstance().broadcast({
      type: "chat-receive",
      payload: {
        userId: user.userId,
        username: user.username,
        message,
        timestamp: new Date().toISOString(),
      }
    }, user, user.spaceId);
  }
}

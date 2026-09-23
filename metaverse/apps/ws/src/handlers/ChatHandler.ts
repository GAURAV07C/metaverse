import { RoomManager } from "../RoomManager";
import { User } from "../User";

export class ChatHandler {
  static handleMessage(user: User, parsedData: any) {
    if (!user.spaceId) return;
    
    RoomManager.getInstance().broadcast({
      type: "chat-receive",
      payload: {
        userId: user.userId,
        username: user.username,
        message: parsedData.payload.message,
        timestamp: new Date().toISOString(),
      }
    }, user, user.spaceId);
  }
}

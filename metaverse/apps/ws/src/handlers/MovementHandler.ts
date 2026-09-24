import { RoomManager } from "../RoomManager";
import { User } from "../User";

export class MovementHandler {
  static async handleMove(user: User, parsedData: any) {
    const moveX = parsedData?.payload?.x;
    const moveY = parsedData?.payload?.y;

    if (
      typeof moveX !== "number" ||
      typeof moveY !== "number" ||
      !Number.isFinite(moveX) ||
      !Number.isFinite(moveY)
    ) {
      user.send({
        type: "movement-rejected",
        payload: { x: user.x, y: user.y },
      });
      return;
    }

    if (!Number.isInteger(moveX) || !Number.isInteger(moveY)) {
      user.send({
        type: "movement-rejected",
        payload: { x: user.x, y: user.y },
      });
      return;
    }

    if (!user.spaceId) {
      user.send({
        type: "movement-rejected",
        payload: { x: user.x, y: user.y },
      });
      return;
    }

    const xDisplacement = Math.abs(user.x - moveX);
    const yDisplacement = Math.abs(user.y - moveY);

    const isOneBlockMove =
      (xDisplacement === 1 && yDisplacement === 0) ||
      (xDisplacement === 0 && yDisplacement === 1);

    const canOccupy = await RoomManager.getInstance().canOccupy(user.spaceId, moveX, moveY);
    if (isOneBlockMove && canOccupy) {
      user.x = moveX;
      user.y = moveY;
      RoomManager.getInstance().broadcast(
        {
          type: "movement",
          payload: {
            userId: user.userId,
            x: user.x,
            y: user.y,
          },
        },
        user,
        user.spaceId,
      );
      
      RoomManager.getInstance().checkProximity(user, user.spaceId);
      return;
    }

    user.send({
      type: "movement-rejected",
      payload: {
        x: user.x,
        y: user.y,
      },
    });
  }
}

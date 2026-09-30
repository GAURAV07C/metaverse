import { RoomManager } from "../RoomManager";
import { User } from "../User";

export class MovementHandler {
  private static reject(user: User, reason = "blocked") {
    user.send({
      type: "movement-rejected",
      payload: { x: user.x, y: user.y, reason },
    });
  }

  private static async commitMove(user: User, x: number, y: number) {
    if (!user.spaceId) return;
    const dynamicCheck = RoomManager.getInstance().canEnterDynamic(user, x, y);
    if (!dynamicCheck.ok) {
      this.reject(user, dynamicCheck.reason);
      return;
    }
    user.x = x;
    user.y = y;
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
  }

  static async handleMove(user: User, parsedData: any) {
    const moveX = parsedData?.payload?.x;
    const moveY = parsedData?.payload?.y;

    if (
      typeof moveX !== "number" ||
      typeof moveY !== "number" ||
      !Number.isFinite(moveX) ||
      !Number.isFinite(moveY)
    ) {
      this.reject(user);
      return;
    }

    if (!Number.isInteger(moveX) || !Number.isInteger(moveY)) {
      this.reject(user);
      return;
    }

    if (!user.spaceId) {
      this.reject(user);
      return;
    }

    const xDisplacement = Math.abs(user.x - moveX);
    const yDisplacement = Math.abs(user.y - moveY);

    const isWithinValidMove = (xDisplacement <= 5 && yDisplacement <= 5);

    const enterCheck = await RoomManager.getInstance().canEnterTile(user, moveX, moveY);
    if (isWithinValidMove && enterCheck.ok) {
      await this.commitMove(user, moveX, moveY);
      return;
    }

    this.reject(user, isWithinValidMove ? enterCheck.reason : "too-far");
  }

  static async handleTeleport(user: User, parsedData: any) {
    const moveX = parsedData?.payload?.x;
    const moveY = parsedData?.payload?.y;

    if (
      typeof moveX !== "number" ||
      typeof moveY !== "number" ||
      !Number.isFinite(moveX) ||
      !Number.isFinite(moveY) ||
      !Number.isInteger(moveX) ||
      !Number.isInteger(moveY) ||
      !user.spaceId
    ) {
      this.reject(user);
      return;
    }

    const enterCheck = await RoomManager.getInstance().canEnterTile(user, moveX, moveY);
    if (!enterCheck.ok) {
      this.reject(user, enterCheck.reason);
      return;
    }

    await this.commitMove(user, moveX, moveY);
  }
}

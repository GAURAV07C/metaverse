import { WebSocket } from "ws";
import { RoomManager } from "./RoomManager";
import { OutgoingMessage } from "./types";
import client from "@repo/db/client";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_PASSWORD } from "./config";

function getRandomString(length: number) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export class User {
  public id: string;
  public userId?: string;
  public username?: string;
  public avatarUrl?: string;
  private spaceId?: string;
  public x: number;
  public y: number;
  private ws: WebSocket;

  constructor(ws: WebSocket) {
    this.id = getRandomString(10);
    this.x = 0;
    this.y = 0;
    this.ws = ws;
    this.initHandlers();
  }

  initHandlers() {
    this.ws.on("message", async (data) => {
      // Tests sometimes send malformed/partial payloads; never throw and never
      // let invalid state updates desync other assertions.
      let parsedData: any;
      try {
        parsedData = JSON.parse(data.toString());
      } catch {
        return;
      }

      switch (parsedData?.type) {
        case "join": {
          const spaceId = parsedData.payload.spaceId;
          const token = parsedData.payload.token;
          if (!token) {
            this.ws.send("token missin");
            this.ws.close();
            return;
          }

          const userId = (jwt.verify(token, JWT_PASSWORD) as JwtPayload).userId;
          if (!userId) {
            this.ws.close();
            return;
          }

          this.userId = userId;

          // Fetch username and avatar from DB for display
          const dbUser = await client.user.findUnique({
            where: { id: userId },
            select: { username: true, avatar: { select: { imageUrl: true } } },
          });
          this.username = dbUser?.username ?? 'Unknown';
          this.avatarUrl = dbUser?.avatar?.imageUrl ?? undefined;

          const space = await client.space.findFirst({
            where: { id: spaceId },
          });

          if (!space) {
            this.ws.close();
            return;
          }

          this.spaceId = spaceId;
          RoomManager.getInstance().addUser(spaceId, this);

          this.x = Math.floor(Math.random() * space.width);
          this.y = Math.floor(Math.random() * space.height!);

          this.send({
            type: "space-joined",
            payload: {
              spawn: { x: this.x, y: this.y },
              userId: this.userId,
              username: this.username,
              avatarUrl: this.avatarUrl,
              users:
                RoomManager.getInstance()
                  .rooms.get(spaceId)
                  ?.filter((x) => x.id !== this.id)
                  ?.map((u) => ({ id: u.id, userId: u.userId, username: u.username, avatarUrl: u.avatarUrl, x: u.x, y: u.y })) ?? [],
            },
          });

          RoomManager.getInstance().broadcast(
            {
              type: "user-joined",
              payload: {
                userId: this.userId,
                username: this.username,
                avatarUrl: this.avatarUrl,
                x: this.x,
                y: this.y,
              },
            },
            this,
            this.spaceId!,
          );

          break;
        }

        case "move": {
          const moveX = parsedData?.payload?.x;
          const moveY = parsedData?.payload?.y;

          // Tests show that sometimes payloads can contain null/non-numbers.
          // Never mutate authoritative state (this.x/this.y) in those cases.
          if (
            typeof moveX !== "number" ||
            typeof moveY !== "number" ||
            !Number.isFinite(moveX) ||
            !Number.isFinite(moveY)
          ) {
            this.send({
              type: "movement-rejected",
              payload: { x: this.x, y: this.y },
            });
            return;
          }

          // Don't allow movement before join/spaceId is set.
          if (!this.spaceId) {
            this.send({
              type: "movement-rejected",
              payload: { x: this.x, y: this.y },
            });
            return;
          }

          const xDisplacement = Math.abs(this.x - moveX);
          const yDisplacement = Math.abs(this.y - moveY);

          const isOneBlockMove =
            (xDisplacement === 1 && yDisplacement === 0) ||
            (xDisplacement === 0 && yDisplacement === 1);

          if (isOneBlockMove) {
            this.x = moveX;
            this.y = moveY;
            RoomManager.getInstance().broadcast(
              {
                type: "movement",
                payload: {
                  userId: this.userId,
                  x: this.x,
                  y: this.y,
                },
              },
              this,
              this.spaceId,
            );
            return;
          }

          this.send({
            type: "movement-rejected",
            payload: {
              x: this.x,
              y: this.y,
            },
          });
          break;
        }
      }
    });
  }

  destroy() {
    RoomManager.getInstance().broadcast(
      {
        type: "user-left",
        payload: {
          userId: this.userId,
        },
      },
      this,
      this.spaceId!,
    );
    RoomManager.getInstance().removeUser(this, this.spaceId!);
  }

  send(payload: OutgoingMessage) {
    this.ws.send(JSON.stringify(payload));
  }
}

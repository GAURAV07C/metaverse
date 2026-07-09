import 'dotenv/config';
import { WebSocketServer } from "ws";
import { User } from "./User";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const wss = new WebSocketServer({ port: PORT });

wss.on("connection", function connection(ws) {
  let user = new User(ws);
  ws.on("error", console.error);

  ws.on("close", () => {
    user?.destroy();
  });
});

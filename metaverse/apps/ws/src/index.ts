import 'dotenv/config';
import { WebSocketServer } from "ws";
import { User } from "./User";
import { MediasoupManager } from "./MediasoupManager";

// Initialize Mediasoup Worker
MediasoupManager.getInstance().init().then(() => {
    if (MediasoupManager.getInstance().isAvailable()) {
        console.log("Mediasoup initialized successfully");
    }
}).catch((err) => {
    console.error("Failed to initialize Mediasoup", err);
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const wss = new WebSocketServer({ port: PORT });

wss.on("connection", function connection(ws) {
  console.log("[WS] New connection established");
  let user = new User(ws);
  ws.on("error", (err) => console.error("[WS] Error:", err));

  ws.on("close", () => {
    console.log("[WS] Connection closed for user:", user?.userId || "unknown");
    user?.destroy();
  });
});

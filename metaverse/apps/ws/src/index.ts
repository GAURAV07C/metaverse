import 'dotenv/config';
import http from "http";
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
const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "metaverse-ws", uptime: process.uptime() }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ message: "Route not found" }));
});

const wss = new WebSocketServer({ server });

wss.on("connection", function connection(ws, req) {
  const url = new URL(req.url || "/", "http://localhost");
  const requestedSpaceId = url.searchParams.get("spaceId") || undefined;
  console.log("[WS] New connection established", { path: url.pathname, spaceId: requestedSpaceId, origin: req.headers.origin });
  let user = new User(ws, requestedSpaceId);
  ws.on("error", (err) => console.error("[WS] Error:", err));

  ws.on("close", () => {
    console.log("[WS] Connection closed for user:", user?.userId || "unknown");
    user?.destroy();
  });
});

server.listen(PORT, () => {
  console.log(`WS server running on port ${PORT}`);
});

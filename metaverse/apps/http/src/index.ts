import 'dotenv/config';
import express from "express";
import cors from "cors";
import { router } from "./routes/v1/index.js";

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({
  limit: '10mb'
}));

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "status" in err && (err as any).status === 400) {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "metaverse-http", uptime: process.uptime() });
});

app.use("/api/v1", router);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: isProduction ? "Internal server error" : err.message });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`HTTP server running on port ${process.env.PORT || 3000}`);
});

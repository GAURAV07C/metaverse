import express from "express";
import cors from "cors";
import { router } from "./routes/v1/index.js";

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "status" in err && (err as any).status === 400) {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  next();
});

app.use("/api/v1", router);

app.listen(process.env.PORT || 3000, () => {
  console.log(`HTTP server running on port ${process.env.PORT || 3000}`);
});

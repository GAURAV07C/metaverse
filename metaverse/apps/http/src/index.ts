import express from "express";
import { router } from "./routes/v1/index.js";

const app = express();
app.use(express.json());

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "status" in err && err.status === 400) {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  next();
});

app.use("/api/v1", router);

app.listen(process.env.PORT || 3000);

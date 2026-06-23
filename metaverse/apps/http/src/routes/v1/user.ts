import { Router } from "express";

export const userRouter = Router();

userRouter.get("/metadata", (req, res) => {
  res.json({
    message: "metadata",
  });
});

userRouter.get("/metadata/bulk", (req, res) => {
  res.json({
    message: "metadata/bulk",
  });
});

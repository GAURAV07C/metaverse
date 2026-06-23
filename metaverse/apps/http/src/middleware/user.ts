import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../config.js";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    export interface Request {
      userId: string;
    }
  }
}

export const userMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;
  const token = header?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const decode = jwt.verify(token, JWT_PASSWORD) as {
      role: string;
      userId: string;
    };

    req.userId = decode.userId;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Unauthorized ,," });
  }
};

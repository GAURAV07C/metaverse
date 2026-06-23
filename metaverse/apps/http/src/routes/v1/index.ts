import { Router } from "express";
import { userRouter } from "./user.js";
import { adminRouter } from "./admin.js";
import { spaceRouter } from "./space.js";
import { SigninSchema, SignupSchema } from "../../types/index.js";
import bcrypt from 'bcrypt';
import { client } from "@repo/db/client";
import jwt from 'jsonwebtoken'
import { JWT_PASSWORD } from "../../config.js";

export const router = Router();

router.post("/signup", async (req, res) => {
  const parseData = SignupSchema.safeParse(req.body);

  if (!parseData.success) {
    return res.status(400).json({ message: "Validation failed" });
  }
  const hashpassword = await bcrypt.hash(parseData.data.password, 10);

  try {

    const existingUser = await client.user.findFirst({
      where:{
        username:parseData.data.username
      }
    })

    if(existingUser){

     return  res.status(400).json({message: "User already exists"})
    }

    const user = await client.user.create({
      data: {
        username: parseData.data.username,
        password: hashpassword,
        role: parseData.data.type === "admin" ? "Admin" : "User",
      },
    });

    res.json({
      userId: user.id,
    });
  } catch (e) {
    res.status(500).json({ message: "Internal server error",e });
  }
});

router.post("/signin", async (req, res) => {
  const parsedData = SigninSchema.safeParse(req.body);
  if (!parsedData.success) {
    return res.status(403).json({ message: "validation failed" });
  }

  try {
    const user = await client.user.findFirst({
      where: {
        username: parsedData.data.username,
      },
    });

    if (!user) {
      res.status(403).json({
        message: "User not found",
      });

      return;
    }

    const isValid = await bcrypt.compare(parsedData.data.password, user.password);

    if (!isValid) {
      res.status(403).json({
        message: "Invalid password",
      });

      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      JWT_PASSWORD
    );

    return res.json({
      token,
    });
  } catch (e) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/elements", (req, res) => {
  res.json({
    message: "elements",
  });
});

router.get("/avatars", (req, res) => {
  res.json({
    message: "avatars",
  });
});

router.use("/user", userRouter);
router.use("/admin", adminRouter);
router.use("/space", spaceRouter);

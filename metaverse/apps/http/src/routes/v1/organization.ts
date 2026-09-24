import { Router } from "express";
import { client } from "@repo/db/client";
import { userMiddleware } from "../../middleware/user.js";

export const organizationRouter = Router();

organizationRouter.post("/", userMiddleware, async (req, res) => {
    try {
        const { name, logo } = req.body;
        const org = await client.organization.create({
            data: {
                name,
                logo
            }
        });
        res.json({ organizationId: org.id });
    } catch (e) {
        res.status(400).json({ message: "Error creating organization" });
    }
});

organizationRouter.post("/:orgId/team", userMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        const team = await client.team.create({
            data: {
                name,
                orgId: req.params.orgId as string
            }
        });
        res.json({ teamId: team.id });
    } catch (e) {
        res.status(400).json({ message: "Error creating team" });
    }
});

import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../config.js";
export const adminMiddleware = (req, res, next) => {
    const header = req.headers.authorization;
    const token = header?.split(" ")[1];
    if (!token) {
        return res.status(403).json({ error: "Unauthorized" });
    }
    try {
        const decode = jwt.verify(token, JWT_PASSWORD);
        if (decode.role !== "Admin") {
            res.status(403).json({ message: "Unauthorized" });
            return;
        }
        req.userId = decode.userId;
        next();
    }
    catch (err) {
        return res.status(403).json({ message: "Unauthorized" });
    }
};
//# sourceMappingURL=admin.js.map
import type { NextFunction, Request, Response } from "express";
declare global {
    namespace Express {
        interface Request {
            role?: "Admin" | "User";
            userId: string;
        }
    }
}
export declare const adminMiddleware: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=admin.d.ts.map
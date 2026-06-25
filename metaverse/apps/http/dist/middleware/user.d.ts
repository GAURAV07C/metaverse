import type { NextFunction, Request, Response } from "express";
declare global {
    namespace Express {
        interface Request {
            userId: string;
        }
    }
}
export declare const userMiddleware: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=user.d.ts.map
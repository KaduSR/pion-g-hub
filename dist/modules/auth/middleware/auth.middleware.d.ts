import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../../../shared/types/entities';
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.middleware.d.ts.map
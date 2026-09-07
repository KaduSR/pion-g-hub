import { RequestHandler } from 'express';
import type { JwtPayload } from '../../shared/types/entities';
export declare const authMiddleware: RequestHandler;
declare module 'express-serve-static-core' {
    interface Request {
        user?: JwtPayload;
    }
}
export declare function requireNivelMinimo(nivel: number): RequestHandler;
export declare function requirePermission(modulo: string, acao: 'create' | 'read' | 'update' | 'delete'): RequestHandler;
//# sourceMappingURL=auth.middleware.d.ts.map
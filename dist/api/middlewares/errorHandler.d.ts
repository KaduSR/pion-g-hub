import { Request, Response, NextFunction } from 'express';
interface CustomError extends Error {
    statusCode?: number;
    code?: string;
    table?: string;
    detail?: string;
    column?: string;
}
export declare function errorHandler(err: CustomError, req: Request, res: Response, _next: NextFunction): void;
export {};
//# sourceMappingURL=errorHandler.d.ts.map
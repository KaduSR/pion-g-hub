import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export declare function validateRequest<T extends z.ZodTypeAny>(schema: T): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validateRequest.d.ts.map
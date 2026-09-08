// PionG Blueprint: Generic Validation Middleware
// Intercepta POST/PUT, valida req.body contra esquema Zod e retorna 400 padronizado
// Referencia: Fase 6 - Seguranca & Validacao

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import type { ApiResponse } from '../../shared/types/entities';

export function validateRequest<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        res.status(400).json({
          success: false,
          error: `Dados invalidos: ${messages}`
        } as ApiResponse<null>);
        return;
      }
      res.status(400).json({
        success: false,
        error: 'Erro de validacao'
      } as ApiResponse<null>);
    }
  };
}

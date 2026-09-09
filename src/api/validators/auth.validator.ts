// PionG Hub: Auth Validator
// Esquema Zod estrito para login e verificacao de token
// Referencia: Fase 6 - Seguranca & Validacao

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '../../shared/types/entities';

// Schema para validacao do login
const loginSchema = z.object({
  email: z.string().email('E-mail invalido'),
  password: z.string().min(1, 'Senha obrigatoria'),
});

// Schema para validacao do token (header Authorization)
const authHeaderSchema = z.object({
  authorization: z
    .string()
    .refine(
      (val) => val.startsWith('Bearer '),
      'Token de autenticacao ausente ou em formato invalido'
    ),
});

// Middleware: valida o corpo do login
export function validateAuthLogin(req: Request, res: Response, next: NextFunction): void {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    res.status(400).json({
      success: false,
      error: `Dados invalidos: ${messages}`,
    } as ApiResponse<null>);
    return;
  }

  next();
}

// Middleware: valida o header Authorization Bearer
export function validateAuthMe(req: Request, res: Response, next: NextFunction): void {
  const result = authHeaderSchema.safeParse(req.headers || {});

  if (!result.success) {
    res.status(401).json({
      success: false,
      error: 'Token nao fornecido',
    } as ApiResponse<null>);
    return;
  }

  next();
}

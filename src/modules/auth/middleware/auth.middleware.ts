// PionG Hub: Auth Middleware
// Verifica JWT Bearer token e injeta req.user nas rotas protegidas

import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import { JwtPayload } from '../../../shared/types/entities';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Token não fornecido'
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verify(token, process.env.JWT_SECRET || 'fallback_secret_for_development_only') as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: 'Token inválido ou expirado'
    });
  }
}

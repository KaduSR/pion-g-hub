// PionG Blueprint: Global Error Handler Middleware
// Intercepta excecoes nao tratadas, formata resposta JSON padronizada e registra logs estruturados
// Referencia: Fase 6 - Resiliência & Tratamento de Erros

import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '../../shared/types/entities';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  table?: string;
  detail?: string;
  column?: string;
}

function getTimestamp(): string {
  return new Date().toISOString();
}

function classifyError(err: CustomError): { status: number; message: string } {
  // Erro ja tratado pelo codigo (validacao Zod, conflito de constraint, etc.)
  if (err.statusCode) {
    return { status: err.statusCode, message: err.message || 'Erro na requisicao' };
  }

  // Erro de banco de dados PostgreSQL (pg-driver)
  if (err.code && err.code.startsWith('23')) {
    const pgCode = err.code;
    if (pgCode === '23505') {
      return { status: 409, message: `Registro duplicado: ${err.detail || 'constraint violada'}` };
    }
    if (pgCode === '23503') {
      return { status: 409, message: `Referencia invalida: ${err.detail || 'foreign key constraint'}` };
    }
    if (pgCode === '23502') {
      return { status: 400, message: `Campo obrigatorio ausente: ${err.column || err.detail || ''}` };
    }
    return { status: 400, message: `Violacao de constraint (${pgCode}): ${err.detail || err.message}` };
  }

  // Erro de sintaxe JSON na requisicao
  if (err instanceof SyntaxError && 'body' in err) {
    return { status: 400, message: 'JSON invalido no corpo da requisicao' };
  }

  // Erro de validacao Zod passado via next(err)
  if (err.name === 'ZodError') {
    return { status: 400, message: err.message || 'Dados invalidos' };
  }

  // Erro de timeout ou conexao
  if (err.message && err.message.includes('timeout')) {
    return { status: 504, message: 'Timeout na requisicao' };
  }

  // Fallback para erro interno
  return { status: 500, message: 'Erro interno do servidor' };
}

function sanitizeError(err: CustomError): Partial<CustomError> {
  const sanitized: Record<string, unknown> = {
    message: err.message,
    code: err.code,
  };

  // Incluir detail apenas em ambiente nao-producao para nao vazar informacoes sensiveis
  if (process.env.NODE_ENV !== 'production') {
    if (err.detail) sanitized.detail = err.detail;
    if (err.stack) sanitized.stack = err.stack;
  }

  return sanitized;
}

export function errorHandler(err: CustomError, req: Request, res: Response, _next: NextFunction): void {
  const timestamp = getTimestamp();
  const { status, message } = classifyError(err);

  // Log estruturado no console com contexto da requisicao
  const logContext = {
    timestamp,
    method: req.method,
    path: req.originalUrl || req.url,
    status,
    errorMessage: err.message,
    errorCode: err.code || 'N/A',
    userAgent: req.headers['user-agent'] || 'N/A',
    ip: req.ip || req.socket.remoteAddress || 'N/A',
    userId: (req as any).user?.sub || 'anonymous',
  };

  if (status >= 500) {
    console.error('[ERROR_500]', JSON.stringify(logContext, null, 2));
  } else if (status >= 400) {
    console.warn('[ERROR_CLIENT]', JSON.stringify(logContext, null, 2));
  } else {
    console.info('[ERROR_HANDLED]', JSON.stringify(logContext, null, 2));
  }

  const response: ApiResponse<null> = {
    success: false,
    error: message,
  };

  // Incluir detalhes tecnicos apenas em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    (response as any).debug = sanitizeError(err);
  }

  res.status(status).json(response);
}

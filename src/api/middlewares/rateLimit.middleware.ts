// Middleware de rate limiting para proteção da API
// Referencia: docs/seguranca-api.md
// Biblioteca: express-rate-limit v8.7.0 — janela deslizante por IP

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Limita requisições públicas de autenticação para mitigar brute force.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  headers: true,
  keyGenerator: (req) => ipKeyGenerator(req.ip || '127.0.0.1'),
  message: {
    success: false,
    error: 'Muitas tentativas de autenticacao. Tente novamente em 15 minutos.',
  },
});

/**
 * Limite padrão para rotas protegidas (leitura/CRUD).
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  headers: true,
  keyGenerator: (req) => ipKeyGenerator(req.ip || '127.0.0.1'),
  message: {
    success: false,
    error: 'Limite de requisicoes excedido. Aguarde alguns minutos e tente novamente.',
  },
});

/**
 * Limite rigoroso para ações destrutivas/exclusão.
 */
export const writeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  headers: true,
  keyGenerator: (req) => ipKeyGenerator(req.ip || '127.0.0.1'),
  message: {
    success: false,
    error: 'Muitas operacoes de escrita. Aguarde alguns minutos.',
  },
});

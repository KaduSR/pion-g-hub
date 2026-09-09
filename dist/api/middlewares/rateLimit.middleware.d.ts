/**
 * Limita requisições públicas de autenticação para mitigar brute force.
 */
export declare const authRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Limite padrão para rotas protegidas (leitura/CRUD).
 */
export declare const apiRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Limite rigoroso para ações destrutivas/exclusão.
 */
export declare const writeRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rateLimit.middleware.d.ts.map
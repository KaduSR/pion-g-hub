"use strict";
// Middleware de rate limiting para proteção da API
// Referencia: docs/seguranca-api.md
// Biblioteca: express-rate-limit v8.7.0 — janela deslizante por IP
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeRateLimiter = exports.apiRateLimiter = exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
/**
 * Limita requisições públicas de autenticação para mitigar brute force.
 */
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    headers: true,
    keyGenerator: (req) => (0, express_rate_limit_1.ipKeyGenerator)(req.ip || '127.0.0.1'),
    message: {
        success: false,
        error: 'Muitas tentativas de autenticacao. Tente novamente em 15 minutos.',
    },
});
/**
 * Limite padrão para rotas protegidas (leitura/CRUD).
 */
exports.apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
    headers: true,
    keyGenerator: (req) => (0, express_rate_limit_1.ipKeyGenerator)(req.ip || '127.0.0.1'),
    message: {
        success: false,
        error: 'Limite de requisicoes excedido. Aguarde alguns minutos e tente novamente.',
    },
});
/**
 * Limite rigoroso para ações destrutivas/exclusão.
 */
exports.writeRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 60,
    headers: true,
    keyGenerator: (req) => (0, express_rate_limit_1.ipKeyGenerator)(req.ip || '127.0.0.1'),
    message: {
        success: false,
        error: 'Muitas operacoes de escrita. Aguarde alguns minutos.',
    },
});
//# sourceMappingURL=rateLimit.middleware.js.map
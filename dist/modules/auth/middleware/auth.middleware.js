"use strict";
// PionG Hub: Auth Middleware
// Verifica JWT Bearer token e injeta req.user nas rotas protegidas
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = require("jsonwebtoken");
function authMiddleware(req, res, next) {
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
        const decoded = (0, jsonwebtoken_1.verify)(token, process.env.JWT_SECRET || 'fallback_secret_for_development_only');
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).json({
            success: false,
            error: 'Token inválido ou expirado'
        });
    }
}
//# sourceMappingURL=auth.middleware.js.map
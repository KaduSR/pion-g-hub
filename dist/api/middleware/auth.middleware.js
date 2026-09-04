"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requirePermission = requirePermission;
exports.requireNivelMinimo = requireNivelMinimo;
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
// Stub for auth.middleware.ts - Build Engineer Emergency Operation
function authMiddleware(req, res, next) { next(); }
function requirePermission(modulo, acao) {
    return (req, res, next) => { next(); };
}
function requireNivelMinimo(nivel) {
    return (req, res, next) => { next(); };
}
function generateToken(user, expiresIn = '1h') { return 'token'; }
function verifyToken(token) { return null; }
//# sourceMappingURL=auth.middleware.js.map
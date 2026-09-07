"use strict";
// PionG Blueprint: Auth Middleware - Autenticacao JWT
// Referencia: docs/piong-blueprint/05-arquitetura-inferida.md
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
exports.requireNivelMinimo = requireNivelMinimo;
exports.requirePermission = requirePermission;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'piong-hub-secret-key-change-in-production';
const authMiddleware = (req, res, next) => {
    const req_ = req;
    const authHeader = req_.headers.authorization;
    if (!authHeader) {
        res.status(401).json({ success: false, error: 'Token nao fornecido' });
        return;
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        res.status(401).json({ success: false, error: 'Token malformado' });
        return;
    }
    const token = parts[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req_.user = decoded;
        next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({ success: false, error: 'Token expirado' });
        }
        else if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({ success: false, error: 'Token invalido' });
        }
        else {
            res.status(401).json({ success: false, error: 'Falha na autenticacao' });
        }
    }
};
exports.authMiddleware = authMiddleware;
function requireNivelMinimo(nivel) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Nao autenticado' });
            return;
        }
        if (req.user.nivel_hierarquico < nivel) {
            res.status(403).json({
                success: false,
                error: `Nivel hierarquico minimo requerido: ${nivel}. Seu nivel: ${req.user.nivel_hierarquico}`
            });
            return;
        }
        next();
    };
}
// Helper: requirePermission - Verifica nivel_hierarquico do usuario
// Perfis hierárquicos (do blueprint 001_initial_schema.sql):
// Administrador=0, Acesso Total=5, Gestor=10, Líder RH=20, Supervisor Manutenção=25
// Líder Produção=30, Equipe Manutenção=35, Qualidad - Refugo=40
// Visualizador Produção=50, Colaborador=60, Somente Leitura=70, Ocultar Tudo=100
function requirePermission(modulo, acao) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Nao autenticado' });
            return;
        }
        // Administrador (nivel 0) tem acesso total
        if (req.user.nivel_hierarquico === 0) {
            next();
            return;
        }
        // Mapeamento de acao para nivel minimo requerido
        const nivelMap = {
            'admin.permissoes': { create: 0, read: 0, update: 0, delete: 0 },
            'admin.usuarios': { create: 0, read: 0, update: 0, delete: 0 },
            'admin.filiais': { create: 0, read: 0, update: 0, delete: 0 },
        };
        const nivelRequerido = nivelMap[modulo]?.[acao] ?? 0;
        if (req.user.nivel_hierarquico > nivelRequerido) {
            res.status(403).json({
                success: false,
                error: `Permissao insuficiente para ${acao} em ${modulo}`
            });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.middleware.js.map
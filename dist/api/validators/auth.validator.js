"use strict";
// PionG Hub: Auth Validator
// Esquema Zod estrito para login e verificacao de token
// Referencia: Fase 6 - Seguranca & Validacao
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAuthLogin = validateAuthLogin;
exports.validateAuthMe = validateAuthMe;
const zod_1 = require("zod");
// Schema para validacao do login
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('E-mail invalido'),
    password: zod_1.z.string().min(1, 'Senha obrigatoria'),
});
// Schema para validacao do token (header Authorization)
const authHeaderSchema = zod_1.z.object({
    authorization: zod_1.z
        .string()
        .refine((val) => val.startsWith('Bearer '), 'Token de autenticacao ausente ou em formato invalido'),
});
// Middleware: valida o corpo do login
function validateAuthLogin(req, res, next) {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        res.status(400).json({
            success: false,
            error: `Dados invalidos: ${messages}`,
        });
        return;
    }
    next();
}
// Middleware: valida o header Authorization Bearer
function validateAuthMe(req, res, next) {
    const result = authHeaderSchema.safeParse(req.headers || {});
    if (!result.success) {
        res.status(401).json({
            success: false,
            error: 'Token nao fornecido',
        });
        return;
    }
    next();
}
//# sourceMappingURL=auth.validator.js.map
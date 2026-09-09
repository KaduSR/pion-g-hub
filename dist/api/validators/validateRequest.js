"use strict";
// PionG Blueprint: Generic Validation Middleware
// Intercepta POST/PUT, valida req.body contra esquema Zod e retorna 400 padronizado
// Referencia: Fase 6 - Seguranca & Validacao
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
const zod_1 = require("zod");
function validateRequest(schema) {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
                res.status(400).json({
                    success: false,
                    error: `Dados invalidos: ${messages}`
                });
                return;
            }
            res.status(400).json({
                success: false,
                error: 'Erro de validacao'
            });
        }
    };
}
//# sourceMappingURL=validateRequest.js.map
"use strict";
// PionG Blueprint: Webhook Validator
// Esquema Zod estrito para criacao/atualizacao de webhooks
// Referencia: Fase 6 - Automacao e Integracoes
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWebhookUpdate = exports.validateWebhookCreate = exports.webhookUpdateSchema = exports.webhookCreateSchema = void 0;
const zod_1 = require("zod");
const validateRequest_1 = require("./validateRequest");
const baseSchema = zod_1.z.object({
    evento: zod_1.z.string().min(1, 'evento obrigatorio').max(80, 'evento muito longo'),
    url_destino: zod_1.z.string().url('url_destino deve ser uma URL valida'),
    ativo: zod_1.z.boolean().optional(),
});
exports.webhookCreateSchema = baseSchema.refine((data) => data.evento.trim().length > 0, { message: 'evento nao pode ser somente espacos', path: ['evento'] });
exports.webhookUpdateSchema = baseSchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser fornecido',
    path: ['body'],
});
exports.validateWebhookCreate = (0, validateRequest_1.validateRequest)(exports.webhookCreateSchema);
exports.validateWebhookUpdate = (0, validateRequest_1.validateRequest)(exports.webhookUpdateSchema);
//# sourceMappingURL=webhook.validator.js.map
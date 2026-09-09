"use strict";
// PionG Blueprint: Logistica Validator
// Esquema Zod estrito para criacao/atualizacao de operacoes logisticas
// Referencia: Fase 4 - Logistica & Fase 6 - Seguranca
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLogisticaUpdate = exports.validateLogisticaCreate = exports.logisticaUpdateSchema = exports.logisticaCreateSchema = void 0;
const zod_1 = require("zod");
const validateRequest_1 = require("./validateRequest");
const STATUS_VALUES = ['Pendente', 'Em Trânsito', 'Entregue', 'Cancelado'];
const baseSchema = zod_1.z.object({
    codigo_rastreio: zod_1.z.string().min(1, 'codigo_rastreio obrigatorio').max(60, 'codigo_rastreio muito longo'),
    colaborador_responsavel_id: zod_1.z.string().uuid('colaborador_responsavel_id deve ser um UUID valido').optional().nullable(),
    origem: zod_1.z.string().min(1, 'origem obrigatoria').max(120, 'origem muito longa'),
    destino: zod_1.z.string().min(1, 'destino obrigatorio').max(120, 'destino muito longo'),
    status_operacao: zod_1.z.enum(STATUS_VALUES).optional(),
    data_prevista: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'data_prevista deve estar no formato YYYY-MM-DD')
        .optional()
        .nullable(),
});
exports.logisticaCreateSchema = baseSchema.refine((data) => data.codigo_rastreio.trim().length > 0 && data.origem.trim().length > 0 && data.destino.trim().length > 0, { message: 'codigo_rastreio, origem e destino sao obrigatorios', path: ['body'] });
exports.logisticaUpdateSchema = baseSchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser fornecido',
    path: ['body'],
});
exports.validateLogisticaCreate = (0, validateRequest_1.validateRequest)(exports.logisticaCreateSchema);
exports.validateLogisticaUpdate = (0, validateRequest_1.validateRequest)(exports.logisticaUpdateSchema);
//# sourceMappingURL=logistica.validator.js.map
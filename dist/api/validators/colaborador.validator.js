"use strict";
// PionG Blueprint: Colaborador Validator
// Esquema Zod estrito para criacao/atualizacao de colaboradores
// Referencia: Fase 2 - RH & Fase 6 - Seguranca
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateColaboradorUpdate = exports.validateColaboradorCreate = exports.colaboradorUpdateSchema = exports.colaboradorCreateSchema = void 0;
const zod_1 = require("zod");
const validateRequest_1 = require("./validateRequest");
const STATUS_VALUES = ['Ativo', 'Inativo', 'Afastado', 'Ferias'];
const baseSchema = zod_1.z.object({
    nome: zod_1.z.string().min(1, 'Nome obrigatorio').max(150, 'Nome muito longo'),
    matricula: zod_1.z.string().min(1, 'Matricula obrigatoria').max(20, 'Matricula muito longa'),
    cpf: zod_1.z.string().regex(/^\d{11}$/, 'CPF deve conter exatamente 11 digitos numericos'),
    cargo_id: zod_1.z.string().uuid('cargo_id deve ser um UUID valido'),
    departamento_id: zod_1.z.string().uuid('departamento_id deve ser um UUID valido'),
    status: zod_1.z.enum(STATUS_VALUES).optional(),
});
exports.colaboradorCreateSchema = baseSchema
    .refine((data) => data.nome.trim().length > 0, { message: 'Nome nao pode ser somente espacos', path: ['nome'] })
    .refine((data) => data.matricula.trim().length > 0, { message: 'Matricula nao pode ser somente espacos', path: ['matricula'] });
exports.colaboradorUpdateSchema = baseSchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser fornecido',
    path: ['body'],
});
exports.validateColaboradorCreate = (0, validateRequest_1.validateRequest)(exports.colaboradorCreateSchema);
exports.validateColaboradorUpdate = (0, validateRequest_1.validateRequest)(exports.colaboradorUpdateSchema);
//# sourceMappingURL=colaborador.validator.js.map
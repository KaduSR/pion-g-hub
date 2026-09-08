// PionG Blueprint: Colaborador Validator
// Esquema Zod estrito para criacao/atualizacao de colaboradores
// Referencia: Fase 2 - RH & Fase 6 - Seguranca

import { z } from 'zod';
import { validateRequest } from './validateRequest';

const STATUS_VALUES = ['Ativo', 'Inativo', 'Afastado', 'Ferias'] as const;

const baseSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatorio').max(150, 'Nome muito longo'),
  matricula: z.string().min(1, 'Matricula obrigatoria').max(20, 'Matricula muito longa'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter exatamente 11 digitos numericos'),
  cargo_id: z.string().uuid('cargo_id deve ser um UUID valido'),
  departamento_id: z.string().uuid('departamento_id deve ser um UUID valido'),
  status: z.enum(STATUS_VALUES).optional(),
});

export const colaboradorCreateSchema = baseSchema
  .refine((data) => data.nome.trim().length > 0, { message: 'Nome nao pode ser somente espacos', path: ['nome'] })
  .refine((data) => data.matricula.trim().length > 0, { message: 'Matricula nao pode ser somente espacos', path: ['matricula'] });

export const colaboradorUpdateSchema = baseSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Pelo menos um campo deve ser fornecido',
  path: ['body'],
});

export const validateColaboradorCreate = validateRequest(colaboradorCreateSchema);
export const validateColaboradorUpdate = validateRequest(colaboradorUpdateSchema);

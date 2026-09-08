// PionG Blueprint: Webhook Validator
// Esquema Zod estrito para criacao/atualizacao de webhooks
// Referencia: Fase 6 - Automacao e Integracoes

import { z } from 'zod';
import { validateRequest } from './validateRequest';

const baseSchema = z.object({
  evento: z.string().min(1, 'evento obrigatorio').max(80, 'evento muito longo'),
  url_destino: z.string().url('url_destino deve ser uma URL valida'),
  ativo: z.boolean().optional(),
});

export const webhookCreateSchema = baseSchema.refine(
  (data) => data.evento.trim().length > 0,
  { message: 'evento nao pode ser somente espacos', path: ['evento'] }
);

export const webhookUpdateSchema = baseSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Pelo menos um campo deve ser fornecido',
  path: ['body'],
});

export const validateWebhookCreate = validateRequest(webhookCreateSchema);
export const validateWebhookUpdate = validateRequest(webhookUpdateSchema);

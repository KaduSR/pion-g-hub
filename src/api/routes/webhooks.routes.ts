// PionG Blueprint: Rotas de Webhooks
// CRUD de configurações de integração - Protegido por authMiddleware + validacao Zod
// Referencia: Fase 6 - Automação e Integrações

import { Router } from 'express';
import { WebhooksController } from '../controllers/webhooks.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateWebhookCreate, validateWebhookUpdate } from '../validators/webhook.validator';

const router = Router();
const controller = new WebhooksController();

// Rotas CRUD protegidas
router.get('/', authMiddleware, controller.listar.bind(controller));
router.post('/', authMiddleware, validateWebhookCreate, controller.criar.bind(controller));
router.put('/:id', authMiddleware, validateWebhookUpdate, controller.atualizar.bind(controller));
router.delete('/:id', authMiddleware, controller.excluir.bind(controller));

export default router;

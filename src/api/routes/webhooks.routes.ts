// PionG Blueprint: Rotas de Webhooks
// CRUD de configurações de integração - Protegido por authMiddleware
// Referencia: Fase 6 - Automação e Integrações

import { Router } from 'express';
import { WebhooksController } from '../controllers/webhooks.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new WebhooksController();

// Rotas CRUD protegidas
router.get('/', authMiddleware, controller.listar.bind(controller));
router.post('/', authMiddleware, controller.criar.bind(controller));
router.put('/:id', authMiddleware, controller.atualizar.bind(controller));
router.delete('/:id', authMiddleware, controller.excluir.bind(controller));

export default router;

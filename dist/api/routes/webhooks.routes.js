"use strict";
// PionG Blueprint: Rotas de Webhooks
// CRUD de configurações de integração - Protegido por authMiddleware + validacao Zod
// Referencia: Fase 6 - Automação e Integrações
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhooks_controller_1 = require("../controllers/webhooks.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const webhook_validator_1 = require("../validators/webhook.validator");
const router = (0, express_1.Router)();
const controller = new webhooks_controller_1.WebhooksController();
// Rotas CRUD protegidas
router.get('/', auth_middleware_1.authMiddleware, controller.listar.bind(controller));
router.post('/', auth_middleware_1.authMiddleware, webhook_validator_1.validateWebhookCreate, controller.criar.bind(controller));
router.put('/:id', auth_middleware_1.authMiddleware, webhook_validator_1.validateWebhookUpdate, controller.atualizar.bind(controller));
router.delete('/:id', auth_middleware_1.authMiddleware, controller.excluir.bind(controller));
exports.default = router;
//# sourceMappingURL=webhooks.routes.js.map
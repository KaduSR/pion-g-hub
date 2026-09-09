"use strict";
// PionG Blueprint: Rotas de Auditoria
// Protegido por authMiddleware e restrito a administradores
// Referencia: Governança e Auditoria de Sistema
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auditoria_controller_1 = require("../controllers/auditoria.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new auditoria_controller_1.AuditoriaController();
// Rota de listagem de logs - Acesso Administrativo
router.get('/', auth_middleware_1.authMiddleware, controller.listarLogs.bind(controller));
exports.default = router;
//# sourceMappingURL=auditoria.routes.js.map
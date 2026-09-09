"use strict";
// PionG Blueprint: Rotas de relatórios
// Referencia: docs/piong-blueprint/03-mapa-funcional.md, 04-matriz-roles.md
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const relatorios_controller_1 = require("../controllers/relatorios.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new relatorios_controller_1.RelatoriosController();
router.get('/colaboradores-csv', auth_middleware_1.authMiddleware, controller.exportarColaboradoresCSV.bind(controller));
router.get('/logistica-csv', auth_middleware_1.authMiddleware, controller.exportarLogisticaCSV.bind(controller));
exports.default = router;
//# sourceMappingURL=relatorios.routes.js.map
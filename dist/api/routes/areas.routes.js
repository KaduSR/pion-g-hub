"use strict";
// PionG Blueprint: Routes - Areas
// Endpoints CRUD para areas
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const areas_controller_1 = require("../controllers/areas.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new areas_controller_1.AreasController();
// GET    /api/v1/areas - Listar todas as areas
router.get('/', auth_middleware_1.authMiddleware, controller.listar.bind(controller));
// GET    /api/v1/areas/:id - Buscar area por ID
router.get('/:id', auth_middleware_1.authMiddleware, controller.buscarPorId.bind(controller));
// POST   /api/v1/areas - Criar nova area
router.post('/', auth_middleware_1.authMiddleware, controller.criar.bind(controller));
// PUT    /api/v1/areas/:id - Atualizar area
router.put('/:id', auth_middleware_1.authMiddleware, controller.atualizar.bind(controller));
// DELETE /api/v1/areas/:id - Excluir area
router.delete('/:id', auth_middleware_1.authMiddleware, controller.excluir.bind(controller));
exports.default = router;
//# sourceMappingURL=areas.routes.js.map
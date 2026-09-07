"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pontos_controller_1 = require("../controllers/pontos.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new pontos_controller_1.PontosController();
router.get('/', auth_middleware_1.authMiddleware, controller.listar.bind(controller));
router.get('/:id', auth_middleware_1.authMiddleware, controller.buscarPorId.bind(controller));
router.post('/', auth_middleware_1.authMiddleware, controller.criar.bind(controller));
router.put('/:id', auth_middleware_1.authMiddleware, controller.atualizar.bind(controller));
router.delete('/:id', auth_middleware_1.authMiddleware, controller.excluir.bind(controller));
exports.default = router;
//# sourceMappingURL=pontos.routes.js.map
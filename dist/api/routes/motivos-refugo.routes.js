"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const motivos_refugo_controller_1 = require("../controllers/motivos-refugo.controller");
const router = (0, express_1.Router)();
const controller = new motivos_refugo_controller_1.MotivosRefugoController();
router.get('/', auth_middleware_1.authMiddleware, (req, res) => controller.listar(req, res));
router.get('/:codigo', auth_middleware_1.authMiddleware, (req, res) => controller.buscarPorId(req, res));
router.post('/', auth_middleware_1.authMiddleware, (req, res) => controller.criar(req, res));
router.put('/:codigo', auth_middleware_1.authMiddleware, (req, res) => controller.atualizar(req, res));
router.delete('/:codigo', auth_middleware_1.authMiddleware, (req, res) => controller.excluir(req, res));
exports.default = router;
//# sourceMappingURL=motivos-refugo.routes.js.map
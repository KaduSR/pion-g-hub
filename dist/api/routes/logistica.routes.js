"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logistica_controller_1 = require("../controllers/logistica.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const logistica_validator_1 = require("../validators/logistica.validator");
const router = (0, express_1.Router)();
const c = new logistica_controller_1.LogisticaController();
router.get('/', auth_middleware_1.authMiddleware, c.listar.bind(c));
router.get('/:id', auth_middleware_1.authMiddleware, c.buscarPorId.bind(c));
router.post('/', auth_middleware_1.authMiddleware, logistica_validator_1.validateLogisticaCreate, c.criar.bind(c));
router.put('/:id', auth_middleware_1.authMiddleware, logistica_validator_1.validateLogisticaUpdate, c.atualizar.bind(c));
router.delete('/:id', auth_middleware_1.authMiddleware, c.excluir.bind(c));
exports.default = router;
//# sourceMappingURL=logistica.routes.js.map
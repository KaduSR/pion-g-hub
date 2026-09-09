"use strict";
// PionG Blueprint: Routes - Colaboradores
// Referencia: docs/piong-blueprint/03-mapa-funcional.md
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const colaboradores_controller_1 = require("../controllers/colaboradores.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const colaborador_validator_1 = require("../validators/colaborador.validator");
const router = (0, express_1.Router)();
const controller = new colaboradores_controller_1.ColaboradoresController();
// GET    /api/v1/colaboradores - Listar todos os colaboradores
router.get('/', auth_middleware_1.authMiddleware, controller.listar.bind(controller));
// GET    /api/v1/colaboradores/:id - Buscar colaborador por ID
router.get('/:id', auth_middleware_1.authMiddleware, controller.buscarPorId.bind(controller));
// POST   /api/v1/colaboradores - Criar novo colaborador
router.post('/', auth_middleware_1.authMiddleware, colaborador_validator_1.validateColaboradorCreate, controller.criar.bind(controller));
// PUT    /api/v1/colaboradores/:id - Atualizar colaborador
router.put('/:id', auth_middleware_1.authMiddleware, colaborador_validator_1.validateColaboradorUpdate, controller.atualizar.bind(controller));
// DELETE /api/v1/colaboradores/:id - Excluir colaborador
router.delete('/:id', auth_middleware_1.authMiddleware, controller.excluir.bind(controller));
exports.default = router;
//# sourceMappingURL=colaboradores.routes.js.map
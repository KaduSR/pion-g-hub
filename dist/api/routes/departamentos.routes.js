"use strict";
// PionG Blueprint: Routes - Departamentos
// Endpoints CRUD para departamentos
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const departamentos_controller_1 = require("../controllers/departamentos.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new departamentos_controller_1.DepartamentosController();
// GET    /api/v1/departamentos - Listar todos os departamentos
router.get('/', auth_middleware_1.authMiddleware, controller.listar.bind(controller));
// GET    /api/v1/departamentos/:id - Buscar departamento por ID
router.get('/:id', auth_middleware_1.authMiddleware, controller.buscarPorId.bind(controller));
// POST   /api/v1/departamentos - Criar novo departamento
router.post('/', auth_middleware_1.authMiddleware, controller.criar.bind(controller));
// PUT    /api/v1/departamentos/:id - Atualizar departamento
router.put('/:id', auth_middleware_1.authMiddleware, controller.atualizar.bind(controller));
// DELETE /api/v1/departamentos/:id - Excluir departamento
router.delete('/:id', auth_middleware_1.authMiddleware, controller.excluir.bind(controller));
exports.default = router;
//# sourceMappingURL=departamentos.routes.js.map
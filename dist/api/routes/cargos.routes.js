"use strict";
// PionG Blueprint: Cargos Routes
// Rotas protegidas JWT para entidade Cargos
// Referencia: docs/piong-blueprint/09-backlog-priorizado.md - secao 9.4 Cargos
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const cargos_controller_1 = require("../controllers/cargos.controller");
const router = (0, express_1.Router)();
const controller = new cargos_controller_1.CargosController();
// GET /api/v1/cargos - Listar todos os cargos
router.get('/', auth_middleware_1.authMiddleware, (req, res) => controller.listar(req, res));
// GET /api/v1/cargos/:id - Buscar cargo por ID
router.get('/:id', auth_middleware_1.authMiddleware, (req, res) => controller.buscarPorId(req, res));
// POST /api/v1/cargos - Criar novo cargo
router.post('/', auth_middleware_1.authMiddleware, (req, res) => controller.criar(req, res));
// PUT /api/v1/cargos/:id - Atualizar cargo
router.put('/:id', auth_middleware_1.authMiddleware, (req, res) => controller.atualizar(req, res));
// DELETE /api/v1/cargos/:id - Excluir cargo
router.delete('/:id', auth_middleware_1.authMiddleware, (req, res) => controller.excluir(req, res));
exports.default = router;
//# sourceMappingURL=cargos.routes.js.map
"use strict";
// PionG Blueprint: Setores Routes
// Rotas protegidas JWT para entidade Setores
// Referencia: docs/piong-blueprint/09-backlog-priorizado.md - secao 9.3 Setores
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const setores_controller_1 = require("../controllers/setores.controller");
const router = (0, express_1.Router)();
const controller = new setores_controller_1.SetoresController();
// GET /api/v1/setores - Listar todos os setores
router.get('/', auth_middleware_1.authMiddleware, (req, res) => controller.listar(req, res));
// GET /api/v1/setores/:id - Buscar setor por ID
router.get('/:id', auth_middleware_1.authMiddleware, (req, res) => controller.buscarPorId(req, res));
// POST /api/v1/setores - Criar novo setor
router.post('/', auth_middleware_1.authMiddleware, (req, res) => controller.criar(req, res));
// PUT /api/v1/setores/:id - Atualizar setor
router.put('/:id', auth_middleware_1.authMiddleware, (req, res) => controller.atualizar(req, res));
// DELETE /api/v1/setores/:id - Excluir setor
router.delete('/:id', auth_middleware_1.authMiddleware, (req, res) => controller.excluir(req, res));
exports.default = router;
//# sourceMappingURL=setores.routes.js.map
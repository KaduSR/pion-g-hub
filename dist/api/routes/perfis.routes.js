"use strict";
// PionG Blueprint: Routes - Perfis
// Referencia: docs/piong-blueprint/03-mapa-funcional.md
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const perfis_controller_1 = require("../controllers/perfis.controller");
const perfis_service_1 = require("../../services/perfis.service");
const perfis_repository_1 = require("../../repositories/perfis.repository");
const database_1 = require("../../shared/database");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new perfis_controller_1.PerfisController(new perfis_service_1.PerfisService(new perfis_repository_1.PerfisRepository(new database_1.PostgresDatabase())));
//GET    /api/v1/perfis - Listar todos os perfis
router.get('/', auth_middleware_1.authMiddleware, controller.listar.bind(controller));
//GET    /api/v1/perfis/:id - Buscar perfil por ID
router.get('/:id', auth_middleware_1.authMiddleware, controller.buscarPorId.bind(controller));
//POST   /api/v1/perfis - Criar novo perfil
router.post('/', auth_middleware_1.authMiddleware, (0, auth_middleware_1.requirePermission)('admin.permissoes', 'create'), controller.criar.bind(controller));
//PUT    /api/v1/perfis/:id - Atualizar perfil
router.put('/:id', auth_middleware_1.authMiddleware, (0, auth_middleware_1.requirePermission)('admin.permissoes', 'update'), controller.atualizar.bind(controller));
//DELETE /api/v1/perfis/:id - Excluir perfil
router.delete('/:id', auth_middleware_1.authMiddleware, (0, auth_middleware_1.requirePermission)('admin.permissoes', 'delete'), controller.excluir.bind(controller));
exports.default = router;
//# sourceMappingURL=perfis.routes.js.map
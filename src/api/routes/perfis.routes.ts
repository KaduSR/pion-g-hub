// PionG Blueprint: Routes - Perfis
// Referencia: docs/piong-blueprint/03-mapa-funcional.md

import { Router } from 'express';
import { PerfisController } from '../controllers/perfis.controller';
import { PerfisService } from '../../services/perfis.service';
import { PerfisRepository } from '../../repositories/perfis.repository';
import { PostgresDatabase } from '../../shared/database';
import { authMiddleware, requirePermission, requireNivelMinimo } from '../middleware/auth.middleware';

const router = Router();
const controller = new PerfisController(new PerfisService(new PerfisRepository(new PostgresDatabase())));

//GET    /api/v1/perfis - Listar todos os perfis
router.get('/', authMiddleware, controller.listar.bind(controller));

//GET    /api/v1/perfis/:id - Buscar perfil por ID
router.get('/:id', authMiddleware, controller.buscarPorId.bind(controller));

//POST   /api/v1/perfis - Criar novo perfil
router.post(
  '/',
  authMiddleware,
  requirePermission('admin.permissoes', 'create'),
  controller.criar.bind(controller)
);

//PUT    /api/v1/perfis/:id - Atualizar perfil
router.put(
  '/:id',
  authMiddleware,
  requirePermission('admin.permissoes', 'update'),
  controller.atualizar.bind(controller)
);

//DELETE /api/v1/perfis/:id - Excluir perfil
router.delete(
  '/:id',
  authMiddleware,
  requirePermission('admin.permissoes', 'delete'),
  controller.excluir.bind(controller)
);

export default router;
// PionG Blueprint: Routes - Areas
// Endpoints CRUD para areas

import { Router } from 'express';
import { AreasController } from '../controllers/areas.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new AreasController();

// GET    /api/v1/areas - Listar todas as areas
router.get('/', authMiddleware, controller.listar.bind(controller));

// GET    /api/v1/areas/:id - Buscar area por ID
router.get('/:id', authMiddleware, controller.buscarPorId.bind(controller));

// POST   /api/v1/areas - Criar nova area
router.post('/', authMiddleware, controller.criar.bind(controller));

// PUT    /api/v1/areas/:id - Atualizar area
router.put('/:id', authMiddleware, controller.atualizar.bind(controller));

// DELETE /api/v1/areas/:id - Excluir area
router.delete('/:id', authMiddleware, controller.excluir.bind(controller));

export default router;

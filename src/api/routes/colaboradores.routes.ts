// PionG Blueprint: Routes - Colaboradores
// Referencia: docs/piong-blueprint/03-mapa-funcional.md

import { Router } from 'express';
import { ColaboradoresController } from '../controllers/colaboradores.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new ColaboradoresController();

// GET    /api/v1/colaboradores - Listar todos os colaboradores
router.get('/', authMiddleware, controller.listar.bind(controller));

// GET    /api/v1/colaboradores/:id - Buscar colaborador por ID
router.get('/:id', authMiddleware, controller.buscarPorId.bind(controller));

// POST   /api/v1/colaboradores - Criar novo colaborador
router.post('/', authMiddleware, controller.criar.bind(controller));

// PUT    /api/v1/colaboradores/:id - Atualizar colaborador
router.put('/:id', authMiddleware, controller.atualizar.bind(controller));

// DELETE /api/v1/colaboradores/:id - Excluir colaborador
router.delete('/:id', authMiddleware, controller.excluir.bind(controller));

export default router;
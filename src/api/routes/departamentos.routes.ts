// PionG Blueprint: Routes - Departamentos
// Endpoints CRUD para departamentos

import { Router } from 'express';
import { DepartamentosController } from '../controllers/departamentos.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new DepartamentosController();

// GET    /api/v1/departamentos - Listar todos os departamentos
router.get('/', authMiddleware, controller.listar.bind(controller));

// GET    /api/v1/departamentos/:id - Buscar departamento por ID
router.get('/:id', authMiddleware, controller.buscarPorId.bind(controller));

// POST   /api/v1/departamentos - Criar novo departamento
router.post('/', authMiddleware, controller.criar.bind(controller));

// PUT    /api/v1/departamentos/:id - Atualizar departamento
router.put('/:id', authMiddleware, controller.atualizar.bind(controller));

// DELETE /api/v1/departamentos/:id - Excluir departamento
router.delete('/:id', authMiddleware, controller.excluir.bind(controller));

export default router;

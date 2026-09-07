// PionG Blueprint: Setores Routes
// Rotas protegidas JWT para entidade Setores
// Referencia: docs/piong-blueprint/09-backlog-priorizado.md - secao 9.3 Setores

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { SetoresController } from '../controllers/setores.controller';

const router = Router();
const controller = new SetoresController();

// GET /api/v1/setores - Listar todos os setores
router.get('/', authMiddleware, (req, res) => controller.listar(req, res));

// GET /api/v1/setores/:id - Buscar setor por ID
router.get('/:id', authMiddleware, (req, res) => controller.buscarPorId(req, res));

// POST /api/v1/setores - Criar novo setor
router.post('/', authMiddleware, (req, res) => controller.criar(req, res));

// PUT /api/v1/setores/:id - Atualizar setor
router.put('/:id', authMiddleware, (req, res) => controller.atualizar(req, res));

// DELETE /api/v1/setores/:id - Excluir setor
router.delete('/:id', authMiddleware, (req, res) => controller.excluir(req, res));

export default router;

// PionG Blueprint: Cargos Routes
// Rotas protegidas JWT para entidade Cargos
// Referencia: docs/piong-blueprint/09-backlog-priorizado.md - secao 9.4 Cargos

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { CargosController } from '../controllers/cargos.controller';

const router = Router();
const controller = new CargosController();

// GET /api/v1/cargos - Listar todos os cargos
router.get('/', authMiddleware, (req, res) => controller.listar(req, res));

// GET /api/v1/cargos/:id - Buscar cargo por ID
router.get('/:id', authMiddleware, (req, res) => controller.buscarPorId(req, res));

// POST /api/v1/cargos - Criar novo cargo
router.post('/', authMiddleware, (req, res) => controller.criar(req, res));

// PUT /api/v1/cargos/:id - Atualizar cargo
router.put('/:id', authMiddleware, (req, res) => controller.atualizar(req, res));

// DELETE /api/v1/cargos/:id - Excluir cargo
router.delete('/:id', authMiddleware, (req, res) => controller.excluir(req, res));

export default router;

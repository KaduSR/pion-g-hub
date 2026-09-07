import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { DefeitosRefugoController } from '../controllers/defeitos-refugo.controller';

const router = Router();
const controller = new DefeitosRefugoController();

router.get('/', authMiddleware, (req, res) => controller.listar(req, res));
router.get('/:codigo', authMiddleware, (req, res) => controller.buscarPorId(req, res));
router.post('/', authMiddleware, (req, res) => controller.criar(req, res));
router.put('/:codigo', authMiddleware, (req, res) => controller.atualizar(req, res));
router.delete('/:codigo', authMiddleware, (req, res) => controller.excluir(req, res));

export default router;

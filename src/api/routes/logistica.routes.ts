import { Router } from 'express';
import { LogisticaController } from '../controllers/logistica.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const c = new LogisticaController();
router.get('/', authMiddleware, c.listar.bind(c));
router.get('/:id', authMiddleware, c.buscarPorId.bind(c));
router.post('/', authMiddleware, c.criar.bind(c));
router.put('/:id', authMiddleware, c.atualizar.bind(c));
router.delete('/:id', authMiddleware, c.excluir.bind(c));
export default router;

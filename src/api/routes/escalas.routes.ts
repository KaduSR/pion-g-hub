import { Router } from 'express';
import { EscalasController } from '../controllers/escalas.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new EscalasController();

router.get('/', authMiddleware, controller.listar.bind(controller));
router.get('/:id', authMiddleware, controller.buscarPorId.bind(controller));
router.post('/', authMiddleware, controller.criar.bind(controller));
router.put('/:id', authMiddleware, controller.atualizar.bind(controller));
router.delete('/:id', authMiddleware, controller.excluir.bind(controller));

export default router;
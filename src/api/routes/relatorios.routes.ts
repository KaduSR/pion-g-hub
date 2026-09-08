// PionG Blueprint: Rotas de relatórios
// Referencia: docs/piong-blueprint/03-mapa-funcional.md, 04-matriz-roles.md

import { Router } from 'express';
import { RelatoriosController } from '../controllers/relatorios.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new RelatoriosController();

router.get('/colaboradores-csv', authMiddleware, controller.exportarColaboradoresCSV.bind(controller));
router.get('/logistica-csv', authMiddleware, controller.exportarLogisticaCSV.bind(controller));

export default router;

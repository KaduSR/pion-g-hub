// PionG Blueprint: Rotas de Auditoria
// Protegido por authMiddleware e restrito a administradores
// Referencia: Governança e Auditoria de Sistema

import { Router } from 'express';
import { AuditoriaController } from '../controllers/auditoria.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new AuditoriaController();

// Rota de listagem de logs - Acesso Administrativo
router.get('/', authMiddleware, controller.listarLogs.bind(controller));

export default router;

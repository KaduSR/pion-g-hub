// PionG Blueprint: Main API Routes Index
// Referencia: docs/piong-blueprint/05-arquitetura-inferida.md

import { Router } from 'express';
import { authMiddleware } from './modules/auth/middleware/auth.middleware';
import perfisRoutes from './api/routes/perfis.routes';
import sessoesRoutes from './api/routes/sessoes.routes';
import authRoutes from './api/routes/auth.routes';
import areasRoutes from './api/routes/areas.routes';
import departamentosRoutes from './api/routes/departamentos.routes';

const router = Router();

// Autenticacao (publico)
router.use('/auth', authRoutes);

// Modulos protegidos por JWT
router.use('/perfis', authMiddleware, perfisRoutes);
router.use('/sessoes', authMiddleware, sessoesRoutes);
router.use('/areas', authMiddleware, areasRoutes);
router.use('/departamentos', authMiddleware, departamentosRoutes);

export default router;

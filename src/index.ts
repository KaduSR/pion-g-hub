// PionG Blueprint: Main API Routes Index
// Referencia: docs/piong-blueprint/05-arquitetura-inferida.md

import { Router } from 'express';
import { authMiddleware } from './modules/auth/middleware/auth.middleware';
import authRoutes from './api/routes/auth.routes';
import areasRoutes from './api/routes/areas.routes';
import departamentosRoutes from './api/routes/departamentos.routes';
import setoresRoutes from './api/routes/setores.routes';
import cargosRoutes from './api/routes/cargos.routes';
import motivosRefugoRoutes from './api/routes/motivos-refugo.routes';
import defeitosRefugoRoutes from './api/routes/defeitos-refugo.routes';
import colaboradoresRoutes from './api/routes/colaboradores.routes';
import escalasRoutes from './api/routes/escalas.routes';

const router = Router();

// Autenticacao (publico)
router.use('/auth', authRoutes);

// Modulos protegidos por JWT
router.use('/areas', authMiddleware, areasRoutes);
router.use('/departamentos', authMiddleware, departamentosRoutes);
router.use('/setores', authMiddleware, setoresRoutes);
router.use('/cargos', authMiddleware, cargosRoutes);
router.use('/motivos-refugo', authMiddleware, motivosRefugoRoutes);
router.use('/defeitos-refugo', authMiddleware, defeitosRefugoRoutes);
router.use('/colaboradores', authMiddleware, colaboradoresRoutes);
router.use('/escalas', authMiddleware, escalasRoutes);

export default router;
// PionG Blueprint: Main API Routes Index
// Referencia: docs/piong-blueprint/05-arquitetura-inferida.md

import { Router } from 'express';
import perfisRoutes from './api/routes/perfis.routes';
import sessoesRoutes from './api/routes/sessoes.routes';

const router = Router();

// Modulo Administrativo - Permissoes
router.use('/perfis', perfisRoutes);

// Modulo Administrativo - Usuarios Online
router.use('/sessoes', sessoesRoutes);

export default router;
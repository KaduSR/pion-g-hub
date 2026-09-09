"use strict";
// PionG Blueprint: Main API Routes Index
// Referencia: docs/piong-blueprint/05-arquitetura-inferida.md
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("./modules/auth/middleware/auth.middleware");
const auth_routes_1 = __importDefault(require("./api/routes/auth.routes"));
const areas_routes_1 = __importDefault(require("./api/routes/areas.routes"));
const departamentos_routes_1 = __importDefault(require("./api/routes/departamentos.routes"));
const setores_routes_1 = __importDefault(require("./api/routes/setores.routes"));
const cargos_routes_1 = __importDefault(require("./api/routes/cargos.routes"));
const motivos_refugo_routes_1 = __importDefault(require("./api/routes/motivos-refugo.routes"));
const defeitos_refugo_routes_1 = __importDefault(require("./api/routes/defeitos-refugo.routes"));
const colaboradores_routes_1 = __importDefault(require("./api/routes/colaboradores.routes"));
const escalas_routes_1 = __importDefault(require("./api/routes/escalas.routes"));
const pontos_routes_1 = __importDefault(require("./api/routes/pontos.routes"));
const logistica_routes_1 = __importDefault(require("./api/routes/logistica.routes"));
const dashboard_routes_1 = __importDefault(require("./api/routes/dashboard.routes"));
const relatorios_routes_1 = __importDefault(require("./api/routes/relatorios.routes"));
const auditoria_routes_1 = __importDefault(require("./api/routes/auditoria.routes"));
const webhooks_routes_1 = __importDefault(require("./api/routes/webhooks.routes"));
const router = (0, express_1.Router)();
// Autenticacao (publico)
router.use('/auth', auth_routes_1.default);
// Modulos protegidos por JWT
router.use('/areas', auth_middleware_1.authMiddleware, areas_routes_1.default);
router.use('/departamentos', auth_middleware_1.authMiddleware, departamentos_routes_1.default);
router.use('/setores', auth_middleware_1.authMiddleware, setores_routes_1.default);
router.use('/cargos', auth_middleware_1.authMiddleware, cargos_routes_1.default);
router.use('/motivos-refugo', auth_middleware_1.authMiddleware, motivos_refugo_routes_1.default);
router.use('/defeitos-refugo', auth_middleware_1.authMiddleware, defeitos_refugo_routes_1.default);
router.use('/colaboradores', auth_middleware_1.authMiddleware, colaboradores_routes_1.default);
router.use('/escalas', auth_middleware_1.authMiddleware, escalas_routes_1.default);
router.use('/pontos', auth_middleware_1.authMiddleware, pontos_routes_1.default);
router.use('/logistica', auth_middleware_1.authMiddleware, logistica_routes_1.default);
router.use('/dashboard', auth_middleware_1.authMiddleware, dashboard_routes_1.default);
router.use('/relatorios', auth_middleware_1.authMiddleware, relatorios_routes_1.default);
router.use('/auditoria', auth_middleware_1.authMiddleware, auditoria_routes_1.default);
router.use('/webhooks', auth_middleware_1.authMiddleware, webhooks_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map
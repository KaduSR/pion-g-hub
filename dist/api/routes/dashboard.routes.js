"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const c = new dashboard_controller_1.DashboardController();
router.get('/metrics', auth_middleware_1.authMiddleware, c.metrics.bind(c));
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map
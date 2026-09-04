"use strict";
// PionG Blueprint: Main API Routes Index
// Referencia: docs/piong-blueprint/05-arquitetura-inferida.md
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const perfis_routes_1 = __importDefault(require("./api/routes/perfis.routes"));
const sessoes_routes_1 = __importDefault(require("./api/routes/sessoes.routes"));
const router = (0, express_1.Router)();
// Modulo Administrativo - Permissoes
router.use('/perfis', perfis_routes_1.default);
// Modulo Administrativo - Usuarios Online
router.use('/sessoes', sessoes_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map
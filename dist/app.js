"use strict";
// PionG Blueprint: Express Application Entry Point
// Referencia: docs/piong-blueprint/05-arquitetura-inferida.md
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const rateLimit_middleware_1 = require("./api/middlewares/rateLimit.middleware");
const index_1 = __importDefault(require("./index"));
const errorHandler_1 = require("./api/middlewares/errorHandler");
const app = (0, express_1.default)();
// Segurança
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
// Rotas públicas: limite rigoroso para auth
app.use('/api/v1/auth', rateLimit_middleware_1.authRateLimiter);
// Rotas protegidas: limite geral
app.use('/api/v1', rateLimit_middleware_1.apiRateLimiter);
// Parsers
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Rotas da API v1
app.use('/api/v1', index_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Rota nao encontrada' });
});
// Error handler global (obrigatoriamente o ultimo middleware)
app.use(errorHandler_1.errorHandler);
const PORT = process.env.PORT || 3000;
// Only listen in production, not during tests
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`PionG API rodando na porta ${PORT}`);
        console.log(`Documentacao: http://localhost:${PORT}/api/v1`);
    });
}
exports.default = app;
//# sourceMappingURL=app.js.map
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
const index_1 = __importDefault(require("./index"));
const app = (0, express_1.default)();
// Middleware de seguranca
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
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
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`PionG API rodando na porta ${PORT}`);
    console.log(`Documentacao: http://localhost:${PORT}/api/v1`);
});
exports.default = app;
//# sourceMappingURL=app.js.map
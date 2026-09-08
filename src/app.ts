// PionG Blueprint: Express Application Entry Point
// Referencia: docs/piong-blueprint/05-arquitetura-inferida.md

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './index';
import { errorHandler } from './api/middlewares/errorHandler';

const app = express();

// Middleware de seguranca
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas da API v1
app.use('/api/v1', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Rota nao encontrada' });
});

// Error handler global (obrigatoriamente o ultimo middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`PionG API rodando na porta ${PORT}`);
  console.log(`Documentacao: http://localhost:${PORT}/api/v1`);
});

export default app;
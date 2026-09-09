// PionG Hub: Integration Tests - Webhooks Routes
// Valida comportamento HTTP das rotas /api/v1/webhooks/* via Supertest
// Referencia: docs/testes-backend.md - Secao 2.2.3

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Configuracao do JWT secret para testes
const JWT_SECRET = 'fallback_secret_for_development_only';
process.env.JWT_SECRET = JWT_SECRET;

const validToken = jwt.sign(
  {
    sub: 'admin-123',
    email: 'admin@pion.com',
    perfil_id: 'perfil-admin',
    nivel_hierarquico: 0,
    filial_id: 'filial-1',
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

let app: any;

beforeAll(async () => {
  vi.resetModules();

  const appModule = await import('@/app');
  app = appModule.default;

  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Helper para configurar mock do banco
async function setupMockDb() {
  const dbModule = await import('@/shared/database');
  const mockDb = {
    query: vi.fn(),
    getClient: vi.fn(),
  };
  dbModule.setDatabase(mockDb);
  return dbModule;
}

describe('Webhooks Integration - GET /api/v1/webhooks', () => {
  beforeEach(async () => {
    await setupMockDb();
  });

  it('deve retornar 401 sem token', async () => {
    const res = await request(app).get('/api/v1/webhooks');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('deve retornar 200 com lista de webhooks', async () => {
    const dbModule = await import('@/shared/database');
    const db = dbModule.getDatabase();
    (db.query as any).mockResolvedValueOnce([
      {
        id: 'webhook-1',
        evento: 'novo_pedido',
        url_destino: 'https://exemplo.com/webhook',
        ativo: true,
      },
    ]);

    const res = await request(app)
      .get('/api/v1/webhooks')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('Webhooks Integration - POST /api/v1/webhooks', () => {
  beforeEach(async () => {
    await setupMockDb();
  });

  it('deve retornar 201 ao criar webhook valido', async () => {
    const dbModule = await import('@/shared/database');
    const db = dbModule.getDatabase();
    (db.query as any).mockResolvedValueOnce([
      {
        id: 'webhook-1',
        evento: 'novo_pedido',
        url_destino: 'https://exemplo.com/webhook',
        ativo: true,
      },
    ]);

    const res = await request(app)
      .post('/api/v1/webhooks')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        evento: 'novo_pedido',
        url_destino: 'https://exemplo.com/webhook',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.evento).toBe('novo_pedido');
  });

  it('deve retornar 400 quando evento ausente', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        url_destino: 'https://exemplo.com/webhook',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Webhooks Integration - PUT /api/v1/webhooks/:id', () => {
  beforeEach(async () => {
    await setupMockDb();
  });

  it('deve retornar 200 ao atualizar webhook', async () => {
    const dbModule = await import('@/shared/database');
    const db = dbModule.getDatabase();
    (db.query as any).mockResolvedValueOnce([
      {
        id: 'webhook-1',
        evento: 'status_atualizado',
        url_destino: 'https://exemplo.com/webhook',
        ativo: true,
      },
    ]);

    const res = await request(app)
      .put('/api/v1/webhooks/webhook-1')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ evento: 'status_atualizado' });

    expect(res.status).toBe(200);
    expect(res.body.data.evento).toBe('status_atualizado');
  });

  it('deve retornar 404 quando webhook nao encontrado', async () => {
    const dbModule = await import('@/shared/database');
    const db = dbModule.getDatabase();
    (db.query as any).mockResolvedValueOnce([]);

    const res = await request(app)
      .put('/api/v1/webhooks/inexistente')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ evento: 'novo_evento' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Webhook não encontrado');
  });
});

describe('Webhooks Integration - DELETE /api/v1/webhooks/:id', () => {
  beforeEach(async () => {
    await setupMockDb();
  });

  it('deve retornar 200 ao excluir webhook', async () => {
    const dbModule = await import('@/shared/database');
    const db = dbModule.getDatabase();
    (db.query as any).mockResolvedValueOnce([{ id: 'webhook-1' }]);
    (db.query as any).mockResolvedValueOnce([]);

    const res = await request(app)
      .delete('/api/v1/webhooks/webhook-1')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
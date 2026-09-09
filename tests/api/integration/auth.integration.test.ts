// PionG Hub: Integration Tests - Auth Routes
// Valida comportamento HTTP das rotas /api/v1/auth/* via Supertest
// Referencia: docs/testes-backend.md - Secao 2.2.1

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'fallback_secret_for_development_only';
process.env.JWT_SECRET = JWT_SECRET;

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

vi.mock('bcryptjs', async () => ({
  ...await vi.importActual('bcryptjs'),
  compare: vi.fn().mockResolvedValue(true),
  hash: vi.fn().mockResolvedValue('mocked_hash'),
}));

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

describe('Auth Integration - POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await setupMockDb();
  });

  it('deve retornar 200 e token quando credenciais sao validas', async () => {
    const dbModule = await import('@/shared/database');
    const db = dbModule.getDatabase();
    (db.query as any).mockResolvedValueOnce([
      {
        id: 'user-123',
        email: 'teste@pion.com',
        senha_hash: '$2a$10$fakehash',
        colaborador_id: 'colab-1',
        perfil_id: 'perfil-1',
        perfil_nome: 'Administrador',
        nivel_hierarquico: 0,
        filial_id: 'filial-1',
        status: true,
        ultimo_login: null,
        updated_at: null,
      },
    ]);
    (db.query as any).mockResolvedValueOnce([]); // INSERT sessoes
    (db.query as any).mockResolvedValueOnce([]); // UPDATE ultimo_login

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'teste@pion.com',
      password: 'senha123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('deve retornar 400 quando email ou senha ausentes', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: '',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('deve retornar 401 quando usuario nao existe', async () => {
    const dbModule = await import('@/shared/database');
    const db = dbModule.getDatabase();
    (db.query as any).mockResolvedValueOnce([]);

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'naoexiste@pion.com',
      password: 'senha123',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Auth Integration - GET /api/v1/auth/me', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await setupMockDb();
  });

  it('deve retornar 401 quando token nao fornecido', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Token não fornecido');
  });

  it('deve retornar 401 quando token e invalido', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer token_invalido');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('deve retornar 200 e dados do usuario quando token e valido', async () => {
    const validToken = jwt.sign(
      {
        sub: 'user-123',
        email: 'teste@pion.com',
        perfil_id: 'perfil-1',
        nivel_hierarquico: 0,
        filial_id: 'filial-1',
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const dbModule = await import('@/shared/database');
    const db = dbModule.getDatabase();
    (db.query as any).mockResolvedValueOnce([
      { id: 'sessao-test', active: true },
    ]);
    (db.query as any).mockResolvedValueOnce([
      {
        id: 'user-123',
        email: 'teste@pion.com',
        colaborador_id: 'colab-1',
        perfil_id: 'perfil-1',
        perfil_nome: 'Administrador',
        nivel_hierarquico: 0,
        filial_id: 'filial-1',
      },
    ]);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('teste@pion.com');
  });
});

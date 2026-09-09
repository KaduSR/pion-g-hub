// PionG Hub: Integration Tests - Colaboradores Routes
// Valida comportamento HTTP das rotas /api/v1/colaboradores/* via Supertest
// Referencia: docs/testes-backend.md - Secao 2.2.2

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

describe('Colaboradores Integration - GET /api/v1/colaboradores', () => {
  beforeEach(async () => {
    await setupMockDb();
  });

  it('deve retornar 401 sem token', async () => {
    const res = await request(app).get('/api/v1/colaboradores');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('deve retornar 200 com lista de colaboradores', async () => {
    const dbModule = await import('@/shared/database');
    const db = dbModule.getDatabase();
    (db.query as any).mockResolvedValueOnce([
      {
        id: 'colab-1',
        nome: 'João Silva',
        matricula: '12345',
        status: 'Ativo',
        cargo_nome: 'Desenvolvedor',
        departamento_nome: 'TI',
      },
    ]);

    const res = await request(app)
      .get('/api/v1/colaboradores')
      .set('Authorization', `Bearer ${validToken}`);

    console.log('COLAB_LIST', JSON.stringify(res.body, null, 2));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('Colaboradores Integration - GET /api/v1/colaboradores/:id', () => {
  beforeEach(async () => {
    await setupMockDb();
  });

  it('deve retornar 200 ao buscar colaborador existente', async () => {
    const dbModule = await import('@/shared/database');
    const db = dbModule.getDatabase();
    (db.query as any).mockResolvedValueOnce([
      {
        id: 'colab-1',
        nome: 'João Silva',
        matricula: '12345',
        cpf: '12345678901',
        status: 'Ativo',
        cargo_nome: 'Desenvolvedor',
        departamento_nome: 'TI',
      },
    ]);

    const res = await request(app)
      .get('/api/v1/colaboradores/colab-1')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.nome).toBe('João Silva');
  });

  it('deve retornar 404 quando colaborador nao encontrado', async () => {
    const dbModule = await import('@/shared/database');
    const db = dbModule.getDatabase();
    (db.query as any).mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/v1/colaboradores/inexistente')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Colaborador nao encontrado');
  });
});

describe('Colaboradores Integration - POST /api/v1/colaboradores', () => {
  beforeEach(async () => {
    await setupMockDb();
  });

  it('deve retornar 201 ao criar colaborador com dados validos', async () => {
    const dbModule = await import('@/shared/database');
    const db = dbModule.getDatabase();
    (db.query as any).mockResolvedValueOnce([
      {
        id: 'colab-new',
        nome: 'Maria Oliveira',
        matricula: '99999',
        status: 'Ativo',
      },
    ]);

    const res = await request(app)
      .post('/api/v1/colaboradores')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        nome: 'Maria Oliveira',
        matricula: '99999',
        cpf: '98765432100',
        cargo_id: '550e8400-e29b-41d4-a716-446655440000',
        departamento_id: '550e8400-e29b-41d4-a716-446655440001',
        filial_id: '550e8400-e29b-41d4-a716-446655440002',
        data_admissao: '2024-01-15',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nome).toBe('Maria Oliveira');
  });

  it('deve retornar 400 quando dados obrigatorios faltam', async () => {
    const res = await request(app)
      .post('/api/v1/colaboradores')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        matricula: '99999',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('deve retornar 400 quando nome vazio (Zod)', async () => {
    const res = await request(app)
      .post('/api/v1/colaboradores')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        nome: '',
        matricula: '99999',
        cpf: '12345678901',
        cargo_id: 'cargo-1',
        departamento_id: 'depto-1',
        filial_id: 'filial-1',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Colaboradores Integration - PUT /api/v1/colaboradores/:id', () => {
  beforeEach(async () => {
    await setupMockDb();
  });

  it('deve retornar 200 ao atualizar colaborador', async () => {
    const dbModule = await import('@/shared/database');
    const db = dbModule.getDatabase();
    (db.query as any).mockResolvedValueOnce([
      {
        id: 'colab-1',
        nome: 'João Atualizado',
        matricula: '12345',
        cpf: '12345678901',
        cargo_id: 'cargo-1',
        departamento_id: 'depto-1',
        status: 'Ativo',
      },
    ]);

    const res = await request(app)
      .put('/api/v1/colaboradores/colab-1')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ nome: 'João Atualizado' });

    expect(res.status).toBe(200);
    expect(res.body.data.nome).toBe('João Atualizado');
  });

  it('deve retornar 400 quando corpo vazio', async () => {
    const res = await request(app)
      .put('/api/v1/colaboradores/colab-1')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('deve retornar 404 quando colaborador nao existe', async () => {
    const dbModule = await import('@/shared/database');
    const db = dbModule.getDatabase();
    (db.query as any).mockResolvedValueOnce([]);

    const res = await request(app)
      .put('/api/v1/colaboradores/inexistente')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ nome: 'Novo Nome' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Colaborador nao encontrado');
  });
});

describe('Colaboradores Integration - DELETE /api/v1/colaboradores/:id', () => {
  beforeEach(async () => {
    await setupMockDb();
  });

  it('deve retornar 200 ao excluir colaborador', async () => {
    const dbModule = await import('@/shared/database');
    const db = dbModule.getDatabase();
    (db.query as any).mockResolvedValueOnce([{ id: 'colab-1', nome: 'João Silva' }]);
    (db.query as any).mockResolvedValueOnce([]);

    const res = await request(app)
      .delete('/api/v1/colaboradores/colab-1')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
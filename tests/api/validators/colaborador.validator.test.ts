import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateColaboradorCreate, validateColaboradorUpdate } from '@/api/validators/colaborador.validator';
import type { Request, Response } from 'express';

describe('Colaborador Validator', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: vi.Mock;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  describe('validateColaboradorCreate', () => {
    it('deve aceitar dados válidos', () => {
      mockReq = {
        body: {
          nome: 'João Silva',
          matricula: '12345',
          cpf: '12345678901',
          cargo_id: '550e8400-e29b-41d4-a716-446655440000',
          departamento_id: '550e8400-e29b-41d4-a716-446655440001',
        },
      };

      validateColaboradorCreate(
        mockReq as Request,
        mockRes as Response,
        next
      );

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('deve rejeitar nome em branco', () => {
      mockReq = {
        body: {
          nome: '',
          matricula: '12345',
          cpf: '12345678901',
          cargo_id: '550e8400-e29b-41d4-a716-446655440000',
          departamento_id: '550e8400-e29b-41d4-a716-446655440001',
        },
      };

      validateColaboradorCreate(
        mockReq as Request,
        mockRes as Response,
        next
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('nome: Nome nao pode ser somente espacos'),
        })
      );
    });

    it('deve rejeitar matricula em branco', () => {
      mockReq = {
        body: {
          nome: 'João Silva',
          matricula: '',
          cpf: '12345678901',
          cargo_id: '550e8400-e29b-41d4-a716-446655440000',
          departamento_id: '550e8400-e29b-41d4-a716-446655440001',
        },
      };

      validateColaboradorCreate(
        mockReq as Request,
        mockRes as Response,
        next
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Matricula nao pode ser somente espacos'),
        })
      );
    });
  });

  describe('validateColaboradorUpdate', () => {
    it('deve aceitar dados parciais', () => {
      mockReq = {
        body: {
          status: 'Ativo',
        },
      };

      validateColaboradorUpdate(
        mockReq as Request,
        mockRes as Response,
        next
      );

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('deve rejeitar corpo vazio', () => {
      mockReq = {
        body: {},
      };

      validateColaboradorUpdate(
        mockReq as Request,
        mockRes as Response,
        next
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Pelo menos um campo deve ser fornecido'),
        })
      );
    });
  });
});
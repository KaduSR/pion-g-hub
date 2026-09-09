import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateWebhookCreate, validateWebhookUpdate } from '@/api/validators/webhook.validator';
import type { Request, Response } from 'express';

describe('Webhook Validator', () => {
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

  describe('validateWebhookCreate', () => {
    it('deve aceitar dados válidos', () => {
      mockReq = {
        body: {
          evento: 'novo_pedido',
          url_destino: 'https://exemplo.com/webhook',
        },
      };

      validateWebhookCreate(
        mockReq as Request,
        mockRes as Response,
        next
      );

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('deve rejeitar evento em branco', () => {
      mockReq = {
        body: {
          evento: '',
          url_destino: 'https://exemplo.com/webhook',
        },
      };

      validateWebhookCreate(
        mockReq as Request,
        mockRes as Response,
        next
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Dados invalidos: evento: evento nao pode ser somente espacos',
        })
      );
    });

    it('deve rejeitar URL inválida', () => {
      mockReq = {
        body: {
          evento: 'novo_pedido',
          url_destino: 'nao-e-uma-url',
        },
      };

      validateWebhookCreate(
        mockReq as Request,
        mockRes as Response,
        next
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Dados invalidos: url_destino: url_destino deve ser uma URL valida',
        })
      );
    });
  });

  describe('validateWebhookUpdate', () => {
    it('deve aceitar dados válidos parciais', () => {
      mockReq = {
        body: {
          evento: 'status_atualizado',
        },
      };

      validateWebhookUpdate(
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

      validateWebhookUpdate(
        mockReq as Request,
        mockRes as Response,
        next
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Pelo menos um campo deve ser fornecido',
        })
      );
    });
  });
});
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateAuthLogin, validateAuthMe } from '@/api/validators/auth.validator';
import type { Request, Response } from 'express';

describe('Auth Validator', () => {
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

  describe('validateAuthLogin', () => {
    it('deve aceitar login válido', () => {
      mockReq = { body: { email: 'teste@pion.com', password: 'senha123' } };
      validateAuthLogin(mockReq as Request, mockRes as Response, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('deve rejeitar email vazio', () => {
      mockReq = { body: { email: '', password: 'senha123' } };
      validateAuthLogin(mockReq as Request, mockRes as Response, next);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('deve rejeitar senha ausente', () => {
      mockReq = { body: { email: 'teste@pion.com' } };
      validateAuthLogin(mockReq as Request, mockRes as Response, next);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateAuthMe', () => {
    it('deve aceitar requisição com token válido', () => {
      mockReq = { headers: { authorization: 'Bearer token_valido' } };
      validateAuthMe(mockReq as Request, mockRes as Response, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('deve rejeitar token ausente', () => {
      mockReq = { headers: {} };
      validateAuthMe(mockReq as Request, mockRes as Response, next);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
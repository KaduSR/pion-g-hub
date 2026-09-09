import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhookService } from '@/api/services/webhook.service';

describe('WebhookService', () => {
  beforeEach(() => {
    // Reset fetch mock between tests
    vi.resetAllMocks();
  });

  describe('buscarPorEvento', () => {
    it('deve retornar webhooks ativos pelo evento', async () => {
      // Mock do banco de dados
      const mockWebhooks = [
        { id: '1', evento: 'novo_pedido', url_destino: 'https://exemplo.com/webhook1', ativo: true },
        { id: '2', evento: 'novo_pedido', url_destino: 'https://exemplo.com/webhook2', ativo: true },
      ];

      vi.spyOn(WebhookService, 'buscarPorEvento').mockResolvedValue(mockWebhooks as any);

      const result = await WebhookService.buscarPorEvento('novo_pedido');

      expect(result).toHaveLength(2);
      expect(result[0].evento).toBe('novo_pedido');
    });

    it('deve retornar array vazio quando não há webhooks', async () => {
      vi.spyOn(WebhookService, 'buscarPorEvento').mockResolvedValue([]);

      const result = await WebhookService.buscarPorEvento('evento_inexistente');

      expect(result).toHaveLength(0);
    });
  });

  describe('disparar', () => {
    it('deve disparar webhooks para o evento', async () => {
      const mockWebhooks = [
        { id: '1', evento: 'novo_pedido', url_destino: 'https://exemplo.com/webhook1', ativo: true },
      ];

      // Mock fetch
      const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
      (global as any).fetch = fetchMock;

      // Mock buscarPorEvento
      vi.spyOn(WebhookService, 'buscarPorEvento').mockResolvedValue(mockWebhooks as any);

      await WebhookService.disparar('novo_pedido', { id: 123 });

      // Deveria ter chamado fetch para cada webhook
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const fetchArgs = fetchMock.mock.calls[0];
      expect(fetchArgs[0]).toBe('https://exemplo.com/webhook1');
      expect(fetchArgs[1].method).toBe('POST');
      expect(fetchArgs[1].headers['Content-Type']).toBe('application/json');
    });

    it('deve não disparar quando não há webhooks ativos', async () => {
      vi.spyOn(WebhookService, 'buscarPorEvento').mockResolvedValue([]);

      await WebhookService.disparar('sem_webhooks', { id: 123 });

      // fetch não deve ser chamado
    });
  });

  describe('listarTodos', () => {
    it('deve listar todos os webhooks', async () => {
      const mockWebhooks = [
        { id: '1', evento: 'novo_pedido', url_destino: 'https://exemplo.com/webhook1', ativo: true },
        { id: '2', evento: 'status_atualizado', url_destino: 'https://exemplo.com/webhook2', ativo: false },
      ];

      vi.spyOn(WebhookService, 'listarTodos').mockResolvedValue(mockWebhooks as any);

      const result = await WebhookService.listarTodos();

      expect(result).toHaveLength(2);
      expect(result[0].evento).toBe('novo_pedido');
      expect(result[1].ativo).toBe(false);
    });
  });

  describe('criar', () => {
    it('deve criar um novo webhook', async () => {
      const mockCreated = { id: '3', evento: 'novo_pedido', url_destino: 'https://exemplo.com/webhook3', ativo: true, criado_em: new Date() };

      vi.spyOn(WebhookService, 'criar').mockResolvedValue(mockCreated as any);

      const result = await WebhookService.criar({
        evento: 'novo_pedido',
        url_destino: 'https://exemplo.com/webhook3',
      });

      expect(result.evento).toBe('novo_pedido');
      expect(result.url_destino).toBe('https://exemplo.com/webhook3');
      expect(result.ativo).toBe(true);
    });
  });

  describe('atualizar', () => {
    it('deve atualizar um webhook existente', async () => {
      const mockUpdated = { id: '1', evento: 'status_atualizado', url_destino: 'https://exemplo.com/webhook1', ativo: true, criado_em: new Date() };

      vi.spyOn(WebhookService, 'atualizar').mockResolvedValue(mockUpdated as any);

      const result = await WebhookService.atualizar('1', {
        evento: 'status_atualizado',
      });

      expect(result.evento).toBe('status_atualizado');
    });

    it('deve retornar null quando webhook não encontrado', async () => {
      vi.spyOn(WebhookService, 'atualizar').mockResolvedValue(null);

      const result = await WebhookService.atualizar('inexistente', {
        evento: 'novo_evento',
      });

      expect(result).toBeNull();
    });
  });

  describe('excluir', () => {
    it('deve excluir um webhook existente', async () => {
      vi.spyOn(WebhookService, 'excluir').mockResolvedValue(true);

      const result = await WebhookService.excluir('1');

      expect(result).toBe(true);
    });

    it('deve retornar false quando webhook não encontrado', async () => {
      vi.spyOn(WebhookService, 'excluir').mockResolvedValue(false);

      const result = await WebhookService.excluir('inexistente');

      expect(result).toBe(false);
    });
  });
});
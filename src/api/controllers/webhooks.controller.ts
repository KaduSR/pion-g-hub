// PionG Blueprint: Webhooks Controller
// CRUD de configurações de webhooks para integrações externas
// Referencia: Fase 6 - Automação e Integrações

import { Request, Response } from 'express';
import { WebhookService, IWebhookConfig } from '../services/webhook.service';
import type { ApiResponse } from '../../shared/types/entities';

export class WebhooksController {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const webhooks = await WebhookService.listarTodos();
      res.status(200).json({
        success: true,
        data: webhooks
      } as ApiResponse<IWebhookConfig[]>);
    } catch (error) {
      console.error('Erro ao listar webhooks:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor ao recuperar webhooks'
      } as ApiResponse<null>);
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const { evento, url_destino, ativo } = req.body;

      if (!evento || !url_destino) {
        res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: evento, url_destino'
        } as ApiResponse<null>);
        return;
      }

      const webhook = await WebhookService.criar({
        evento,
        url_destino,
        ativo: ativo ?? true
      });

      res.status(201).json({
        success: true,
        data: webhook
      } as ApiResponse<IWebhookConfig>);
    } catch (error) {
      console.error('Erro ao criar webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor ao criar webhook'
      } as ApiResponse<null>);
    }
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { evento, url_destino, ativo } = req.body;

      const webhook = await WebhookService.atualizar(id, {
        evento,
        url_destino,
        ativo
      });

      if (!webhook) {
        res.status(404).json({
          success: false,
          error: 'Webhook não encontrado'
        } as ApiResponse<null>);
        return;
      }

      res.status(200).json({
        success: true,
        data: webhook
      } as ApiResponse<IWebhookConfig>);
    } catch (error) {
      console.error('Erro ao atualizar webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor ao atualizar webhook'
      } as ApiResponse<null>);
    }
  }

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const removido = await WebhookService.excluir(id);

      if (!removido) {
        res.status(404).json({
          success: false,
          error: 'Webhook não encontrado'
        } as ApiResponse<null>);
        return;
      }

      res.status(200).json({
        success: true,
        data: null
      } as ApiResponse<null>);
    } catch (error) {
      console.error('Erro ao excluir webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor ao excluir webhook'
      } as ApiResponse<null>);
    }
  }
}

// PionG Blueprint: Webhook Service
// Serviço centralizado para disparo de eventos para integrações externas
// Referencia: Fase 6 - Automação e Integrações

import { getDatabase } from '../../shared/database';

export interface IWebhookConfig {
  id?: string;
  evento: string;
  url_destino: string;
  ativo?: boolean;
  criado_em?: Date;
}

export interface IWebhookPayload {
  evento: string;
  timestamp: string;
  dados: any;
}

export class WebhookService {
  static async buscarPorEvento(evento: string): Promise<IWebhookConfig[]> {
    try {
      const db = getDatabase();
      const rows = await db.query<IWebhookConfig>(
        'SELECT id, evento, url_destino, ativo, criado_em FROM webhooks_config WHERE evento = $1 AND ativo = TRUE',
        [evento]
      );
      return rows;
    } catch (error) {
      console.error('[WEBHOOK_ERROR]: Falha ao buscar webhooks por evento:', error);
      return [];
    }
  }

  static async disparar(evento: string, dados: any): Promise<void> {
    try {
      const webhooks = await this.buscarPorEvento(evento);
      if (!webhooks.length) return;

      const payload: IWebhookPayload = {
        evento,
        timestamp: new Date().toISOString(),
        dados,
      };

      // Dispara de forma não-bloqueante para não impactar o fluxo principal
      webhooks.forEach((webhook) => {
        fetch(webhook.url_destino, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch((err) => {
          console.error(`[WEBHOOK_ERROR]: Falha ao disparar webhook ${webhook.id}:`, err);
        });
      });
    } catch (error) {
      // Não deve derrubar o fluxo principal da aplicação
      console.error('[WEBHOOK_ERROR]: Falha ao disparar webhooks:', error);
    }
  }

  static async listarTodos(): Promise<IWebhookConfig[]> {
    try {
      const db = getDatabase();
      const rows = await db.query<IWebhookConfig>(
        'SELECT id, evento, url_destino, ativo, criado_em FROM webhooks_config ORDER BY criado_em DESC'
      );
      return rows;
    } catch (error) {
      console.error('[WEBHOOK_ERROR]: Falha ao listar webhooks:', error);
      return [];
    }
  }

  static async criar(config: Omit<IWebhookConfig, 'id' | 'criado_em'>): Promise<IWebhookConfig> {
    try {
      const db = getDatabase();
      const rows = await db.query<IWebhookConfig>(
        'INSERT INTO webhooks_config (evento, url_destino, ativo) VALUES ($1, $2, $3) RETURNING id, evento, url_destino, ativo, criado_em',
        [config.evento, config.url_destino, config.ativo ?? true]
      );
      return rows[0];
    } catch (error) {
      console.error('[WEBHOOK_ERROR]: Falha ao criar webhook:', error);
      throw error;
    }
  }

  static async atualizar(id: string, config: Partial<Omit<IWebhookConfig, 'id' | 'criado_em'>>): Promise<IWebhookConfig | null> {
    try {
      const db = getDatabase();
      const sets: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (config.evento !== undefined) { sets.push(`evento = $${idx++}`); params.push(config.evento); }
      if (config.url_destino !== undefined) { sets.push(`url_destino = $${idx++}`); params.push(config.url_destino); }
      if (config.ativo !== undefined) { sets.push(`ativo = $${idx++}`); params.push(config.ativo); }

      if (!sets.length) return null;

      params.push(id);
      const rows = await db.query<IWebhookConfig>(
        `UPDATE webhooks_config SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, evento, url_destino, ativo, criado_em`,
        params
      );
      return rows[0] || null;
    } catch (error) {
      console.error('[WEBHOOK_ERROR]: Falha ao atualizar webhook:', error);
      throw error;
    }
  }

  static async excluir(id: string): Promise<boolean> {
    try {
      const db = getDatabase();
      const result = await db.query('DELETE FROM webhooks_config WHERE id = $1', [id]);
      return (result as any).length > 0;
    } catch (error) {
      console.error('[WEBHOOK_ERROR]: Falha ao excluir webhook:', error);
      throw error;
    }
  }
}

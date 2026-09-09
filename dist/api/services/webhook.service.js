"use strict";
// PionG Blueprint: Webhook Service
// Serviço centralizado para disparo de eventos para integrações externas
// Referencia: Fase 6 - Automação e Integrações
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const database_1 = require("../../shared/database");
class WebhookService {
    static async buscarPorEvento(evento) {
        try {
            const db = (0, database_1.getDatabase)();
            const rows = await db.query('SELECT id, evento, url_destino, ativo, criado_em FROM webhooks_config WHERE evento = $1 AND ativo = TRUE', [evento]);
            return rows;
        }
        catch (error) {
            console.error('[WEBHOOK_ERROR]: Falha ao buscar webhooks por evento:', error);
            return [];
        }
    }
    static async disparar(evento, dados) {
        try {
            const webhooks = await this.buscarPorEvento(evento);
            if (!webhooks.length)
                return;
            const payload = {
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
        }
        catch (error) {
            // Não deve derrubar o fluxo principal da aplicação
            console.error('[WEBHOOK_ERROR]: Falha ao disparar webhooks:', error);
        }
    }
    static async listarTodos() {
        try {
            const db = (0, database_1.getDatabase)();
            const rows = await db.query('SELECT id, evento, url_destino, ativo, criado_em FROM webhooks_config ORDER BY criado_em DESC');
            return rows;
        }
        catch (error) {
            console.error('[WEBHOOK_ERROR]: Falha ao listar webhooks:', error);
            return [];
        }
    }
    static async criar(config) {
        try {
            const db = (0, database_1.getDatabase)();
            const rows = await db.query('INSERT INTO webhooks_config (evento, url_destino, ativo) VALUES ($1, $2, $3) RETURNING id, evento, url_destino, ativo, criado_em', [config.evento, config.url_destino, config.ativo ?? true]);
            return rows[0];
        }
        catch (error) {
            console.error('[WEBHOOK_ERROR]: Falha ao criar webhook:', error);
            throw error;
        }
    }
    static async atualizar(id, config) {
        try {
            const db = (0, database_1.getDatabase)();
            const sets = [];
            const params = [];
            let idx = 1;
            if (config.evento !== undefined) {
                sets.push(`evento = $${idx++}`);
                params.push(config.evento);
            }
            if (config.url_destino !== undefined) {
                sets.push(`url_destino = $${idx++}`);
                params.push(config.url_destino);
            }
            if (config.ativo !== undefined) {
                sets.push(`ativo = $${idx++}`);
                params.push(config.ativo);
            }
            if (!sets.length)
                return null;
            params.push(id);
            const rows = await db.query(`UPDATE webhooks_config SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, evento, url_destino, ativo, criado_em`, params);
            return rows[0] || null;
        }
        catch (error) {
            console.error('[WEBHOOK_ERROR]: Falha ao atualizar webhook:', error);
            throw error;
        }
    }
    static async excluir(id) {
        try {
            const db = (0, database_1.getDatabase)();
            const result = await db.query('DELETE FROM webhooks_config WHERE id = $1', [id]);
            return result.length > 0;
        }
        catch (error) {
            console.error('[WEBHOOK_ERROR]: Falha ao excluir webhook:', error);
            throw error;
        }
    }
}
exports.WebhookService = WebhookService;
//# sourceMappingURL=webhook.service.js.map
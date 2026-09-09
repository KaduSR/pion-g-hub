"use strict";
// PionG Blueprint: Webhooks Controller
// CRUD de configurações de webhooks para integrações externas
// Referencia: Fase 6 - Automação e Integrações
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksController = void 0;
const webhook_service_1 = require("../services/webhook.service");
class WebhooksController {
    async listar(req, res) {
        try {
            const webhooks = await webhook_service_1.WebhookService.listarTodos();
            res.status(200).json({
                success: true,
                data: webhooks
            });
        }
        catch (error) {
            console.error('Erro ao listar webhooks:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor ao recuperar webhooks'
            });
        }
    }
    async criar(req, res) {
        try {
            const { evento, url_destino, ativo } = req.body;
            if (!evento || !url_destino) {
                res.status(400).json({
                    success: false,
                    error: 'Campos obrigatórios: evento, url_destino'
                });
                return;
            }
            const webhook = await webhook_service_1.WebhookService.criar({
                evento,
                url_destino,
                ativo: ativo ?? true
            });
            res.status(201).json({
                success: true,
                data: webhook
            });
        }
        catch (error) {
            console.error('Erro ao criar webhook:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor ao criar webhook'
            });
        }
    }
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { evento, url_destino, ativo } = req.body;
            const webhook = await webhook_service_1.WebhookService.atualizar(id, {
                evento,
                url_destino,
                ativo
            });
            if (!webhook) {
                res.status(404).json({
                    success: false,
                    error: 'Webhook não encontrado'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: webhook
            });
        }
        catch (error) {
            console.error('Erro ao atualizar webhook:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor ao atualizar webhook'
            });
        }
    }
    async excluir(req, res) {
        try {
            const { id } = req.params;
            const removido = await webhook_service_1.WebhookService.excluir(id);
            if (!removido) {
                res.status(404).json({
                    success: false,
                    error: 'Webhook não encontrado'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: null
            });
        }
        catch (error) {
            console.error('Erro ao excluir webhook:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor ao excluir webhook'
            });
        }
    }
}
exports.WebhooksController = WebhooksController;
//# sourceMappingURL=webhooks.controller.js.map
"use strict";
// PionG Blueprint: Controller - Sessoes (Usuarios Online)
// Referencia: docs/piong-blueprint/03-mapa-funcional.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessoesController = void 0;
class SessoesController {
    service;
    constructor(service) {
        this.service = service;
    }
    async listar(req, res) {
        try {
            const filters = {
                status: req.query.status || undefined,
                usuario_id: req.query.usuario_id,
                data_inicio: req.query.data_inicio ? new Date(req.query.data_inicio) : undefined,
                data_fim: req.query.data_fim ? new Date(req.query.data_fim) : undefined
            };
            const sessoes = await this.service.listar(filters);
            res.json({ success: true, data: sessoes });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao listar sessoes';
            res.status(500).json({ success: false, error: message });
        }
    }
    async listarAtivas(req, res) {
        try {
            const sessoes = await this.service.listarAtivas();
            res.json({ success: true, data: sessoes });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao listar sessoes ativas';
            res.status(500).json({ success: false, error: message });
        }
    }
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const sessao = await this.service.buscarPorId(id);
            if (!sessao) {
                res.status(404).json({ success: false, error: 'Sessao nao encontrada' });
                return;
            }
            res.json({ success: true, data: sessao });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao buscar sessao';
            res.status(500).json({ success: false, error: message });
        }
    }
    async buscarDetalhe(req, res) {
        try {
            const { id } = req.params;
            const sessao = await this.service.buscarDetalhe(id);
            if (!sessao) {
                res.status(404).json({ success: false, error: 'Sessao nao encontrada' });
                return;
            }
            res.json({ success: true, data: sessao });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao buscar detalhes da sessao';
            res.status(500).json({ success: false, error: message });
        }
    }
    async buscarPorUsuario(req, res) {
        try {
            const { usuario_id } = req.params;
            const sessoes = await this.service.buscarPorUsuario(usuario_id);
            res.json({ success: true, data: sessoes });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao buscar sessoes do usuario';
            res.status(500).json({ success: false, error: message });
        }
    }
    async forcarLogout(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.id;
            const sessao = await this.service.forcarLogout(id, adminId);
            res.json({ success: true, data: sessao, message: 'Logout forcado com sucesso' });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao forcar logout';
            res.status(400).json({ success: false, error: message });
        }
    }
    async getHistorico(req, res) {
        try {
            const { id } = req.params;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
            const historico = await this.service.getHistorico(id, limit);
            res.json({ success: true, data: historico });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao buscar historico';
            res.status(500).json({ success: false, error: message });
        }
    }
    async countAtivas(req, res) {
        try {
            const count = await this.service.countAtivas();
            res.json({ success: true, data: { count } });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao contar sessoes';
            res.status(500).json({ success: false, error: message });
        }
    }
    async refreshToken(req, res) {
        try {
            const { id } = req.params;
            const sessao = await this.service.refreshSessao(id);
            res.json({ success: true, data: sessao, message: 'Token atualizado com sucesso' });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao atualizar token';
            res.status(400).json({ success: false, error: message });
        }
    }
}
exports.SessoesController = SessoesController;
//# sourceMappingURL=sessoes.controller.js.map
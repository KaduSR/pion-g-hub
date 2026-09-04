"use strict";
// PionG Blueprint: Controller - Perfis
// Referencia: docs/piong-blueprint/03-mapa-funcional.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerfisController = void 0;
class PerfisController {
    service;
    constructor(service) {
        this.service = service;
    }
    async listar(req, res) {
        try {
            const filters = {
                status: req.query.status !== undefined ? req.query.status === 'true' : undefined,
                nivel_min: req.query.nivel_min ? parseInt(req.query.nivel_min, 10) : undefined,
                nivel_max: req.query.nivel_max ? parseInt(req.query.nivel_max, 10) : undefined,
                modulo_permissao: req.query.modulo_permissao,
                busca: req.query.busca
            };
            const perfis = await this.service.listar(filters);
            res.json({ success: true, data: perfis });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao listar perfis';
            res.status(500).json({ success: false, error: message });
        }
    }
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const perfil = await this.service.buscarPorId(id);
            if (!perfil) {
                res.status(404).json({ success: false, error: 'Perfil nao encontrado' });
                return;
            }
            res.json({ success: true, data: perfil });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao buscar perfil';
            res.status(500).json({ success: false, error: message });
        }
    }
    async criar(req, res) {
        try {
            const data = {
                nome: req.body.nome,
                descricao: req.body.descricao,
                nivel_hierarquico: req.body.nivel_hierarquico,
                status: req.body.status
            };
            const perfil = await this.service.criar(data);
            res.status(201).json({ success: true, data: perfil, message: 'Perfil criado com sucesso' });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao criar perfil';
            res.status(400).json({ success: false, error: message });
        }
    }
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const data = {
                nome: req.body.nome,
                descricao: req.body.descricao,
                nivel_hierarquico: req.body.nivel_hierarquico,
                status: req.body.status
            };
            const perfil = await this.service.atualizar(id, data);
            if (!perfil) {
                res.status(404).json({ success: false, error: 'Perfil nao encontrado' });
                return;
            }
            res.json({ success: true, data: perfil, message: 'Perfil atualizado com sucesso' });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao atualizar perfil';
            res.status(400).json({ success: false, error: message });
        }
    }
    async excluir(req, res) {
        try {
            const { id } = req.params;
            const force = req.query.force === 'true';
            const resultado = await this.service.excluir(id, force);
            res.json({ success: resultado.sucesso, message: resultado.message });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao excluir perfil';
            res.status(400).json({ success: false, error: message });
        }
    }
    async duplicar(req, res) {
        try {
            const { id } = req.params;
            const { novo_nome } = req.body;
            if (!novo_nome) {
                res.status(400).json({ success: false, error: 'Nome do novo perfil e obrigatorio' });
                return;
            }
            const perfil = await this.service.duplicar(id, novo_nome);
            res.status(201).json({ success: true, data: perfil, message: 'Perfil duplicado com sucesso' });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao duplicar perfil';
            res.status(400).json({ success: false, error: message });
        }
    }
    async getPermissoes(req, res) {
        try {
            const { id } = req.params;
            const permissoes = await this.service.getPermissoes(id);
            res.json({ success: true, data: permissoes });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao buscar permissoes';
            res.status(500).json({ success: false, error: message });
        }
    }
    async atualizarPermissoes(req, res) {
        try {
            const { id } = req.params;
            const permissoes = req.body.permissoes;
            if (!permissoes || !Array.isArray(permissoes)) {
                res.status(400).json({ success: false, error: 'Lista de permissoes invalida' });
                return;
            }
            const result = await this.service.atualizarPermissoes(id, permissoes);
            res.json({ success: true, data: result, message: 'Permissoes atualizadas com sucesso' });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao atualizar permissoes';
            res.status(400).json({ success: false, error: message });
        }
    }
}
exports.PerfisController = PerfisController;
//# sourceMappingURL=perfis.controller.js.map
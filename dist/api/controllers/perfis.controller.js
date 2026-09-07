"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerfisController = void 0;
class PerfisController {
    service;
    constructor(service) {
        this.service = service;
    }
    async listar(req, res) {
        res.json({ success: true, data: [] });
    }
    async buscarPorId(req, res) {
        res.json({ success: true, data: null });
    }
    async criar(req, res) {
        res.status(201).json({ success: true, data: {}, message: 'Perfil criado com sucesso' });
    }
    async atualizar(req, res) {
        res.json({ success: true, data: {}, message: 'Perfil atualizado com sucesso' });
    }
    async excluir(req, res) {
        res.json({ success: true, message: 'Perfil excluido com sucesso' });
    }
    async duplicar(req, res) {
        res.status(201).json({ success: true, data: {}, message: 'Perfil duplicado com sucesso' });
    }
    async getPermissoes(req, res) {
        res.json({ success: true, data: [] });
    }
    async atualizarPermissoes(req, res) {
        res.json({ success: true, message: 'Permissoes atualizadas com sucesso' });
    }
}
exports.PerfisController = PerfisController;
//# sourceMappingURL=perfis.controller.js.map
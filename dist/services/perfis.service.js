"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerfisService = void 0;
class PerfisService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async listar() { return []; }
    async buscarPorId(id) { return null; }
    async criar(data) { return { id: '1', ...data }; }
    async atualizar(id, data) { return true; }
    async excluir(id) { return true; }
    async listarPermissoes(perfilId) { return []; }
    async atualizarPermissoes(perfilId, permissoes) { return true; }
}
exports.PerfisService = PerfisService;
//# sourceMappingURL=perfis.service.js.map
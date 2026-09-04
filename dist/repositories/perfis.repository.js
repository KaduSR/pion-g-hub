"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerfisRepository = void 0;
// Stub for perfis.repository.ts - Build Engineer Emergency Operation
class PerfisRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async findAll() { return []; }
    async findById(id) { return null; }
    async create(data) { return { id: '1', ...data }; }
    async update(id, data) { return true; }
    async delete(id) { return true; }
    async findPermissoesByPerfilId(perfilId) { return []; }
    async updatePermissoes(perfilId, permissoes) { return true; }
}
exports.PerfisRepository = PerfisRepository;
//# sourceMappingURL=perfis.repository.js.map
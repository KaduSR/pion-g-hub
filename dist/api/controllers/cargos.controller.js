"use strict";
// PionG Blueprint: Cargos Controller
// Endpoints CRUD para entidade Cargos
// Referencia: docs/piong-blueprint/09-backlog-priorizado.md - secao 9.4 Cargos
Object.defineProperty(exports, "__esModule", { value: true });
exports.CargosController = void 0;
const database_1 = require("../../shared/database");
class CargosController {
    // GET /api/v1/cargos - Listar todos os cargos
    async listar(_req, res) {
        try {
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT id, descricao, descricao_curta, status
        FROM cargos
        ORDER BY descricao
      `);
            res.json({ success: true, data: rows });
        }
        catch (error) {
            console.error('Erro ao listar cargos:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // GET /api/v1/cargos/:id - Buscar cargo por ID
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT id, descricao, descricao_curta, status
        FROM cargos
        WHERE id = $1
      `, [id]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Cargo nao encontrado' });
                return;
            }
            res.json({ success: true, data: rows[0] });
        }
        catch (error) {
            console.error('Erro ao buscar cargo:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // POST /api/v1/cargos - Criar novo cargo
    async criar(req, res) {
        try {
            const { descricao, descricao_curta, status } = req.body;
            if (!descricao || !descricao_curta) {
                res.status(400).json({ success: false, error: 'Descricao e descricao_curta sao obrigatorios' });
                return;
            }
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        INSERT INTO cargos (descricao, descricao_curta, status)
        VALUES ($1, $2, $3)
        RETURNING id, descricao, descricao_curta, status
      `, [descricao, descricao_curta, status ?? 'Ativo']);
            res.status(201).json({ success: true, data: rows[0] });
        }
        catch (error) {
            console.error('Erro ao criar cargo:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // PUT /api/v1/cargos/:id - Atualizar cargo
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { descricao, descricao_curta, status } = req.body;
            if (!descricao && !descricao_curta && !status) {
                res.status(400).json({ success: false, error: 'Pelo menos um campo deve ser fornecido' });
                return;
            }
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        UPDATE cargos
        SET descricao = COALESCE($1, descricao),
            descricao_curta = COALESCE($2, descricao_curta),
            status = COALESCE($3, status)
        WHERE id = $4
        RETURNING id, descricao, descricao_curta, status
      `, [descricao || null, descricao_curta || null, status || null, id]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Cargo nao encontrado' });
                return;
            }
            res.json({ success: true, data: rows[0], message: 'Cargo atualizado com sucesso' });
        }
        catch (error) {
            console.error('Erro ao atualizar cargo:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // DELETE /api/v1/cargos/:id - Excluir cargo
    async excluir(req, res) {
        try {
            const { id } = req.params;
            const db = (0, database_1.getDatabase)();
            await db.query(`DELETE FROM cargos WHERE id = $1`, [id]);
            res.json({ success: true, message: 'Cargo excluido com sucesso' });
        }
        catch (error) {
            console.error('Erro ao excluir cargo:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
}
exports.CargosController = CargosController;
//# sourceMappingURL=cargos.controller.js.map
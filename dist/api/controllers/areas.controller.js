"use strict";
// PionG Blueprint: Areas Controller
// Endpoints CRUD para entidade Areas
Object.defineProperty(exports, "__esModule", { value: true });
exports.AreasController = void 0;
const database_1 = require("../../shared/database");
class AreasController {
    // GET /api/areas - Listar todas as areas
    async listar(_req, res) {
        try {
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT id, descricao, descricao_curta, status
        FROM areas
        ORDER BY descricao
      `);
            res.json({ success: true, data: rows });
        }
        catch (error) {
            console.error('Erro ao listar areas:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // GET /api/areas/:id - Buscar area por ID
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT id, descricao, descricao_curta, status
        FROM areas
        WHERE id = $1
      `, [id]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Area nao encontrada' });
                return;
            }
            res.json({ success: true, data: rows[0] });
        }
        catch (error) {
            console.error('Erro ao buscar area:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // POST /api/areas - Criar nova area
    async criar(req, res) {
        try {
            const { descricao, descricao_curta, status } = req.body;
            if (!descricao || !descricao_curta) {
                res.status(400).json({ success: false, error: 'Descricao e descricao_curta sao obrigatorios' });
                return;
            }
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        INSERT INTO areas (descricao, descricao_curta, status)
        VALUES ($1, $2, $3)
        RETURNING id, descricao, descricao_curta, status
      `, [descricao, descricao_curta, status ?? 'Ativo']);
            res.status(201).json({ success: true, data: rows[0] });
        }
        catch (error) {
            console.error('Erro ao criar area:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // PUT /api/areas/:id - Atualizar area
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
        UPDATE areas
        SET descricao = COALESCE($1, descricao),
            descricao_curta = COALESCE($2, descricao_curta),
            status = COALESCE($3, status)
        WHERE id = $4
        RETURNING id, descricao, descricao_curta, status
      `, [descricao || null, descricao_curta || null, status || null, id]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Area nao encontrada' });
                return;
            }
            res.json({ success: true, data: rows[0], message: 'Area atualizada com sucesso' });
        }
        catch (error) {
            console.error('Erro ao atualizar area:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // DELETE /api/areas/:id - Excluir area
    async excluir(req, res) {
        try {
            const { id } = req.params;
            const db = (0, database_1.getDatabase)();
            const result = await db.query(`DELETE FROM areas WHERE id = $1`, [id]);
            res.json({ success: true, message: 'Area excluida com sucesso' });
        }
        catch (error) {
            console.error('Erro ao excluir area:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
}
exports.AreasController = AreasController;
//# sourceMappingURL=areas.controller.js.map
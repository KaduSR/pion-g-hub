"use strict";
// PionG Blueprint: Setores Controller
// Endpoints CRUD para entidade Setores
// Referencia: docs/piong-blueprint/09-backlog-priorizado.md - secao 9.3 Setores
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetoresController = void 0;
const database_1 = require("../../shared/database");
class SetoresController {
    // GET /api/v1/setores - Listar todos os setores
    async listar(_req, res) {
        try {
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT id, descricao, descricao_curta, status
        FROM setores
        ORDER BY descricao
      `);
            res.json({ success: true, data: rows });
        }
        catch (error) {
            console.error('Erro ao listar setores:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // GET /api/v1/setores/:id - Buscar setor por ID
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT id, descricao, descricao_curta, status
        FROM setores
        WHERE id = $1
      `, [id]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Setor nao encontrado' });
                return;
            }
            res.json({ success: true, data: rows[0] });
        }
        catch (error) {
            console.error('Erro ao buscar setor:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // POST /api/v1/setores - Criar novo setor
    async criar(req, res) {
        try {
            const { descricao, descricao_curta, status } = req.body;
            if (!descricao || !descricao_curta) {
                res.status(400).json({ success: false, error: 'Descricao e descricao_curta sao obrigatorios' });
                return;
            }
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        INSERT INTO setores (descricao, descricao_curta, status)
        VALUES ($1, $2, $3)
        RETURNING id, descricao, descricao_curta, status
      `, [descricao, descricao_curta, status ?? 'Ativo']);
            res.status(201).json({ success: true, data: rows[0] });
        }
        catch (error) {
            console.error('Erro ao criar setor:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // PUT /api/v1/setores/:id - Atualizar setor
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
        UPDATE setores
        SET descricao = COALESCE($1, descricao),
            descricao_curta = COALESCE($2, descricao_curta),
            status = COALESCE($3, status)
        WHERE id = $4
        RETURNING id, descricao, descricao_curta, status
      `, [descricao || null, descricao_curta || null, status || null, id]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Setor nao encontrado' });
                return;
            }
            res.json({ success: true, data: rows[0], message: 'Setor atualizado com sucesso' });
        }
        catch (error) {
            console.error('Erro ao atualizar setor:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // DELETE /api/v1/setores/:id - Excluir setor
    async excluir(req, res) {
        try {
            const { id } = req.params;
            const db = (0, database_1.getDatabase)();
            await db.query(`DELETE FROM setores WHERE id = $1`, [id]);
            res.json({ success: true, message: 'Setor excluido com sucesso' });
        }
        catch (error) {
            console.error('Erro ao excluir setor:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
}
exports.SetoresController = SetoresController;
//# sourceMappingURL=setores.controller.js.map
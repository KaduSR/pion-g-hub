"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MotivosRefugoController = void 0;
const database_1 = require("../../shared/database");
class MotivosRefugoController {
    async listar(_req, res) {
        try {
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT codigo, descricao, tipo, status
        FROM motivos_refugo
        ORDER BY codigo
      `);
            res.json({ success: true, data: rows });
        }
        catch (error) {
            console.error('Erro ao listar motivos:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async buscarPorId(req, res) {
        try {
            const { codigo } = req.params;
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT codigo, descricao, tipo, status
        FROM motivos_refugo
        WHERE codigo = $1
      `, [codigo]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Motivo nao encontrado' });
                return;
            }
            res.json({ success: true, data: rows[0] });
        }
        catch (error) {
            console.error('Erro ao buscar motivo:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async criar(req, res) {
        try {
            const { codigo, descricao, tipo, status } = req.body;
            if (!codigo || !descricao || !tipo) {
                res.status(400).json({ success: false, error: 'Codigo, descricao e tipo sao obrigatorios' });
                return;
            }
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        INSERT INTO motivos_refugo (codigo, descricao, tipo, status)
        VALUES ($1, $2, $3, $4)
        RETURNING codigo, descricao, tipo, status
      `, [codigo, descricao, tipo, status ?? 'Ativo']);
            res.status(201).json({ success: true, data: rows[0] });
        }
        catch (error) {
            console.error('Erro ao criar motivo:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async atualizar(req, res) {
        try {
            const { codigo } = req.params;
            const { descricao, tipo, status } = req.body;
            if (!descricao && !tipo && !status) {
                res.status(400).json({ success: false, error: 'Pelo menos um campo deve ser fornecido' });
                return;
            }
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        UPDATE motivos_refugo
        SET descricao = COALESCE($1, descricao),
            tipo = COALESCE($2, tipo),
            status = COALESCE($3, status)
        WHERE codigo = $4
        RETURNING codigo, descricao, tipo, status
      `, [descricao || null, tipo || null, status || null, codigo]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Motivo nao encontrado' });
                return;
            }
            res.json({ success: true, data: rows[0], message: 'Motivo atualizado com sucesso' });
        }
        catch (error) {
            console.error('Erro ao atualizar motivo:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async excluir(req, res) {
        try {
            const { codigo } = req.params;
            const db = (0, database_1.getDatabase)();
            await db.query(`DELETE FROM motivos_refugo WHERE codigo = $1`, [codigo]);
            res.json({ success: true, message: 'Motivo excluido com sucesso' });
        }
        catch (error) {
            console.error('Erro ao excluir motivo:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
}
exports.MotivosRefugoController = MotivosRefugoController;
//# sourceMappingURL=motivos-refugo.controller.js.map
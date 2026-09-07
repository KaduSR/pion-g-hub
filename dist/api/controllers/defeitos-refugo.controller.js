"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefeitosRefugoController = void 0;
const database_1 = require("../../shared/database");
class DefeitosRefugoController {
    async listar(_req, res) {
        try {
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT codigo, descricao, setores_precos, custo_base, status
        FROM defeitos_refugo
        ORDER BY codigo
      `);
            res.json({ success: true, data: rows });
        }
        catch (error) {
            console.error('Erro ao listar defeitos:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async buscarPorId(req, res) {
        try {
            const { codigo } = req.params;
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT codigo, descricao, setores_precos, custo_base, status
        FROM defeitos_refugo
        WHERE codigo = $1
      `, [codigo]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Defeito nao encontrado' });
                return;
            }
            res.json({ success: true, data: rows[0] });
        }
        catch (error) {
            console.error('Erro ao buscar defeito:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async criar(req, res) {
        try {
            const { codigo, descricao, setores_precos, custo_base, status } = req.body;
            if (!codigo || !descricao) {
                res.status(400).json({ success: false, error: 'Codigo e descricao sao obrigatorios' });
                return;
            }
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        INSERT INTO defeitos_refugo (codigo, descricao, setores_precos, custo_base, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING codigo, descricao, setores_precos, custo_base, status
      `, [codigo, descricao, setores_precos ?? null, custo_base ?? 0.00, status ?? 'Ativo']);
            res.status(201).json({ success: true, data: rows[0] });
        }
        catch (error) {
            console.error('Erro ao criar defeito:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async atualizar(req, res) {
        try {
            const { codigo } = req.params;
            const { descricao, setores_precos, custo_base, status } = req.body;
            if (!descricao && !setores_precos && !custo_base && !status) {
                res.status(400).json({ success: false, error: 'Pelo menos um campo deve ser fornecido' });
                return;
            }
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        UPDATE defeitos_refugo
        SET descricao = COALESCE($1, descricao),
            setores_precos = COALESCE($2, setores_precos),
            custo_base = COALESCE($3, custo_base),
            status = COALESCE($4, status)
        WHERE codigo = $5
        RETURNING codigo, descricao, setores_precos, custo_base, status
      `, [descricao || null, setores_precos || null, custo_base || null, status || null, codigo]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Defeito nao encontrado' });
                return;
            }
            res.json({ success: true, data: rows[0], message: 'Defeito atualizado com sucesso' });
        }
        catch (error) {
            console.error('Erro ao atualizar defeito:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async excluir(req, res) {
        try {
            const { codigo } = req.params;
            const db = (0, database_1.getDatabase)();
            await db.query(`DELETE FROM defeitos_refugo WHERE codigo = $1`, [codigo]);
            res.json({ success: true, message: 'Defeito excluido com sucesso' });
        }
        catch (error) {
            console.error('Erro ao excluir defeito:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
}
exports.DefeitosRefugoController = DefeitosRefugoController;
//# sourceMappingURL=defeitos-refugo.controller.js.map
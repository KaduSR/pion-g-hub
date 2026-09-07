"use strict";
// PionG Blueprint: Departamentos Controller
// Endpoints CRUD para entidade Departamentos
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartamentosController = void 0;
const database_1 = require("../../shared/database");
class DepartamentosController {
    // GET /api/departamentos - Listar todos os departamentos
    async listar(_req, res) {
        try {
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT id, descricao, descricao_curta, status
        FROM departamentos
        ORDER BY descricao
      `);
            res.json({ success: true, data: rows });
        }
        catch (error) {
            console.error('Erro ao listar departamentos:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // GET /api/departamentos/:id - Buscar departamento por ID
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT id, descricao, descricao_curta, status
        FROM departamentos
        WHERE id = $1
      `, [id]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Departamento nao encontrado' });
                return;
            }
            res.json({ success: true, data: rows[0] });
        }
        catch (error) {
            console.error('Erro ao buscar departamento:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // POST /api/departamentos - Criar novo departamento
    async criar(req, res) {
        try {
            const { descricao, descricao_curta, status } = req.body;
            if (!descricao || !descricao_curta) {
                res.status(400).json({ success: false, error: 'Descricao e descricao_curta sao obrigatorios' });
                return;
            }
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        INSERT INTO departamentos (descricao, descricao_curta, status)
        VALUES ($1, $2, $3)
        RETURNING id, descricao, descricao_curta, status
      `, [descricao, descricao_curta, status ?? 'Ativo']);
            res.status(201).json({ success: true, data: rows[0] });
        }
        catch (error) {
            console.error('Erro ao criar departamento:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // PUT /api/departamentos/:id - Atualizar departamento
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
        UPDATE departamentos
        SET descricao = COALESCE($1, descricao),
            descricao_curta = COALESCE($2, descricao_curta),
            status = COALESCE($3, status)
        WHERE id = $4
        RETURNING id, descricao, descricao_curta, status
      `, [descricao || null, descricao_curta || null, status || null, id]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Departamento nao encontrado' });
                return;
            }
            res.json({ success: true, data: rows[0], message: 'Departamento atualizado com sucesso' });
        }
        catch (error) {
            console.error('Erro ao atualizar departamento:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // DELETE /api/departamentos/:id - Excluir departamento
    async excluir(req, res) {
        try {
            const { id } = req.params;
            const db = (0, database_1.getDatabase)();
            await db.query(`DELETE FROM departamentos WHERE id = $1`, [id]);
            res.json({ success: true, message: 'Departamento excluido com sucesso' });
        }
        catch (error) {
            console.error('Erro ao excluir departamento:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
}
exports.DepartamentosController = DepartamentosController;
//# sourceMappingURL=departamentos.controller.js.map
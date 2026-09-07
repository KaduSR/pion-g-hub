"use strict";
// PionG Blueprint: Colaboradores Controller
// Endpoints CRUD para entidade Colaboradores (RH)
// Referencia: docs/piong-blueprint/03-mapa-funcional.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColaboradoresController = void 0;
const database_1 = require("../../shared/database");
class ColaboradoresController {
    // GET /api/colaboradores - Listar todos os colaboradores
    async listar(_req, res) {
        try {
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT c.id, c.nome, c.matricula, c.cpf,
               c.cargo_id, c.departamento_id, c.status,
               cr.descricao as cargo_nome,
               d.descricao as departamento_nome,
               c.created_at, c.updated_at
        FROM colaboradores c
        LEFT JOIN cargos cr ON c.cargo_id = cr.id
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        ORDER BY c.nome
      `);
            res.json({ success: true, data: rows });
        }
        catch (error) {
            console.error('Erro ao listar colaboradores:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // GET /api/colaboradores/:id - Buscar colaborador por ID
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT c.id, c.nome, c.matricula, c.cpf,
               c.cargo_id, c.departamento_id, c.status,
               cr.descricao as cargo_nome,
               d.descricao as departamento_nome,
               c.created_at, c.updated_at
        FROM colaboradores c
        LEFT JOIN cargos cr ON c.cargo_id = cr.id
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        WHERE c.id = $1
      `, [id]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Colaborador nao encontrado' });
                return;
            }
            res.json({ success: true, data: rows[0] });
        }
        catch (error) {
            console.error('Erro ao buscar colaborador:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // POST /api/colaboradores - Criar novo colaborador
    async criar(req, res) {
        try {
            const { nome, matricula, cpf, cargo_id, departamento_id, status } = req.body;
            if (!nome || !matricula || !cpf || !cargo_id || !departamento_id) {
                res.status(400).json({
                    success: false,
                    error: 'Nome, matricula, cpf, cargo_id e departamento_id sao obrigatorios'
                });
                return;
            }
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        INSERT INTO colaboradores (nome, matricula, cpf, cargo_id, departamento_id, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nome, matricula, cpf, cargo_id, departamento_id, status
      `, [nome, matricula, cpf, cargo_id, departamento_id, status ?? 'Ativo']);
            res.status(201).json({ success: true, data: rows[0], message: 'Colaborador criado com sucesso' });
        }
        catch (error) {
            console.error('Erro ao criar colaborador:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // PUT /api/colaboradores/:id - Atualizar colaborador
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { nome, matricula, cpf, cargo_id, departamento_id, status } = req.body;
            if (!nome && !matricula && !cpf && !cargo_id && !departamento_id && !status) {
                res.status(400).json({
                    success: false,
                    error: 'Pelo menos um campo deve ser fornecido'
                });
                return;
            }
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        UPDATE colaboradores
        SET nome = COALESCE($1, nome),
            matricula = COALESCE($2, matricula),
            cpf = COALESCE($3, cpf),
            cargo_id = COALESCE($4, cargo_id),
            departamento_id = COALESCE($5, departamento_id),
            status = COALESCE($6, status)
        WHERE id = $7
        RETURNING id, nome, matricula, cpf, cargo_id, departamento_id, status
      `, [nome || null, matricula || null, cpf || null, cargo_id || null, departamento_id || null, status || null, id]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Colaborador nao encontrado' });
                return;
            }
            res.json({ success: true, data: rows[0], message: 'Colaborador atualizado com sucesso' });
        }
        catch (error) {
            console.error('Erro ao atualizar colaborador:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // DELETE /api/colaboradores/:id - Excluir colaborador
    async excluir(req, res) {
        try {
            const { id } = req.params;
            const db = (0, database_1.getDatabase)();
            await db.query(`DELETE FROM colaboradores WHERE id = $1`, [id]);
            res.json({ success: true, message: 'Colaborador excluido com sucesso' });
        }
        catch (error) {
            console.error('Erro ao excluir colaborador:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
}
exports.ColaboradoresController = ColaboradoresController;
//# sourceMappingURL=colaboradores.controller.js.map
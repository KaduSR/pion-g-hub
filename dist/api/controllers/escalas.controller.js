"use strict";
// PionG Blueprint: Escalas Controller
// Endpoints CRUD para Escala do Mes (RH)
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscalasController = void 0;
const database_1 = require("../../shared/database");
class EscalasController {
    async listar(_req, res) {
        try {
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT e.id, e.colaborador_id, e.data_escala, e.turno, e.status,
               c.nome as colaborador_nome,
               e.created_at, e.updated_at
        FROM escala_mes e
        LEFT JOIN colaboradores c ON e.colaborador_id = c.id
        ORDER BY e.data_escala DESC, c.nome
      `);
            res.json({ success: true, data: rows });
        }
        catch (error) {
            console.error('Erro ao listar escalas:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT e.id, e.colaborador_id, e.data_escala, e.turno, e.status,
               c.nome as colaborador_nome,
               e.created_at, e.updated_at
        FROM escala_mes e
        LEFT JOIN colaboradores c ON e.colaborador_id = c.id
        WHERE e.id = $1
      `, [id]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Escala nao encontrada' });
                return;
            }
            res.json({ success: true, data: rows[0] });
        }
        catch (error) {
            console.error('Erro ao buscar escala:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async criar(req, res) {
        try {
            const { colaborador_id, data_escala, turno, status } = req.body;
            if (!colaborador_id || !data_escala || !turno) {
                res.status(400).json({ success: false, error: 'colaborador_id, data_escala e turno sao obrigatorios' });
                return;
            }
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        INSERT INTO escala_mes (colaborador_id, data_escala, turno, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id, colaborador_id, data_escala, turno, status
      `, [colaborador_id, data_escala, turno, status ?? 'Previsto']);
            res.status(201).json({ success: true, data: rows[0], message: 'Escala criada com sucesso' });
        }
        catch (error) {
            console.error('Erro ao criar escala:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { colaborador_id, data_escala, turno, status } = req.body;
            if (!colaborador_id && !data_escala && !turno && !status) {
                res.status(400).json({ success: false, error: 'Pelo menos um campo deve ser fornecido' });
                return;
            }
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        UPDATE escala_mes
        SET colaborador_id = COALESCE($1, colaborador_id),
            data_escala = COALESCE($2, data_escala),
            turno = COALESCE($3, turno),
            status = COALESCE($4, status)
        WHERE id = $5
        RETURNING id, colaborador_id, data_escala, turno, status
      `, [colaborador_id || null, data_escala || null, turno || null, status || null, id]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Escala nao encontrada' });
                return;
            }
            res.json({ success: true, data: rows[0], message: 'Escala atualizada com sucesso' });
        }
        catch (error) {
            console.error('Erro ao atualizar escala:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async excluir(req, res) {
        try {
            const { id } = req.params;
            const db = (0, database_1.getDatabase)();
            await db.query(`DELETE FROM escala_mes WHERE id = $1`, [id]);
            res.json({ success: true, message: 'Escala excluida com sucesso' });
        }
        catch (error) {
            console.error('Erro ao excluir escala:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
}
exports.EscalasController = EscalasController;
//# sourceMappingURL=escalas.controller.js.map
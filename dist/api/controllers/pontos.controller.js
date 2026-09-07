"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PontosController = void 0;
const database_1 = require("../../shared/database");
class PontosController {
    async listar(_req, res) {
        try {
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT p.id, p.colaborador_id, p.data_registro,
               p.hora_entrada, p.hora_saida, p.tipo_registro,
               p.observacao,
               c.nome as colaborador_nome,
               p.created_at, p.updated_at
        FROM controle_ponto p
        LEFT JOIN colaboradores c ON p.colaborador_id = c.id
        ORDER BY p.data_registro DESC, c.nome
      `);
            res.json({ success: true, data: rows });
        }
        catch (error) {
            console.error('Erro ao listar pontos:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT p.id, p.colaborador_id, p.data_registro,
               p.hora_entrada, p.hora_saida, p.tipo_registro,
               p.observacao,
               c.nome as colaborador_nome,
               p.created_at, p.updated_at
        FROM controle_ponto p
        LEFT JOIN colaboradores c ON p.colaborador_id = c.id
        WHERE p.id = $1
      `, [id]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Registro de ponto nao encontrado' });
                return;
            }
            res.json({ success: true, data: rows[0] });
        }
        catch (error) {
            console.error('Erro ao buscar ponto:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async criar(req, res) {
        try {
            const { colaborador_id, data_registro, hora_entrada, hora_saida, tipo_registro, observacao } = req.body;
            if (!colaborador_id || !data_registro) {
                res.status(400).json({ success: false, error: 'colaborador_id e data_registro sao obrigatorios' });
                return;
            }
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        INSERT INTO controle_ponto (colaborador_id, data_registro, hora_entrada, hora_saida, tipo_registro, observacao)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, colaborador_id, data_registro, hora_entrada, hora_saida, tipo_registro, observacao
      `, [colaborador_id, data_registro, hora_entrada || null, hora_saida || null, tipo_registro || 'Normal', observacao || null]);
            res.status(201).json({ success: true, data: rows[0], message: 'Registro de ponto criado com sucesso' });
        }
        catch (error) {
            console.error('Erro ao criar ponto:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { colaborador_id, data_registro, hora_entrada, hora_saida, tipo_registro, observacao } = req.body;
            if (!colaborador_id && !data_registro && !hora_entrada && !hora_saida && !tipo_registro && !observacao) {
                res.status(400).json({ success: false, error: 'Pelo menos um campo deve ser fornecido' });
                return;
            }
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        UPDATE controle_ponto
        SET colaborador_id = COALESCE($1, colaborador_id),
            data_registro = COALESCE($2, data_registro),
            hora_entrada = COALESCE($3, hora_entrada),
            hora_saida = COALESCE($4, hora_saida),
            tipo_registro = COALESCE($5, tipo_registro),
            observacao = COALESCE($6, observacao)
        WHERE id = $7
        RETURNING id, colaborador_id, data_registro, hora_entrada, hora_saida, tipo_registro, observacao
      `, [colaborador_id || null, data_registro || null, hora_entrada || null, hora_saida || null, tipo_registro || null, observacao || null, id]);
            if (rows.length === 0) {
                res.status(404).json({ success: false, error: 'Registro de ponto nao encontrado' });
                return;
            }
            res.json({ success: true, data: rows[0], message: 'Registro de ponto atualizado com sucesso' });
        }
        catch (error) {
            console.error('Erro ao atualizar ponto:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    async excluir(req, res) {
        try {
            const { id } = req.params;
            const db = (0, database_1.getDatabase)();
            await db.query(`DELETE FROM controle_ponto WHERE id = $1`, [id]);
            res.json({ success: true, message: 'Registro de ponto excluido com sucesso' });
        }
        catch (error) {
            console.error('Erro ao excluir ponto:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
}
exports.PontosController = PontosController;
//# sourceMappingURL=pontos.controller.js.map
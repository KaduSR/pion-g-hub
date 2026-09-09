"use strict";
// PionG Blueprint: Relatórios Controller
// Exportação de dados analíticos em CSV para colaboradores e logística
// Referencia: docs/piong-blueprint/03-mapa-funcional.md, 04-matriz-roles.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelatoriosController = void 0;
const database_1 = require("../../shared/database");
class RelatoriosController {
    // GET /api/v1/relatorios/colaboradores-csv
    async exportarColaboradoresCSV(req, res) {
        try {
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT
          c.nome,
          c.matricula,
          c.cpf,
          cr.descricao as cargo,
          d.descricao as departamento,
          c.status,
          c.created_at,
          c.updated_at
        FROM colaboradores c
        LEFT JOIN cargos cr ON c.cargo_id = cr.id
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        ORDER BY c.nome
      `);
            const headers = [
                'Nome',
                'Matricula',
                'CPF',
                'Cargo',
                'Departamento',
                'Status',
                'Data Admissao',
                'Data Desligamento',
                'Created At',
                'Updated At'
            ];
            const csv = this.buildCSV(headers, rows);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=relatorio_colaboradores.csv');
            res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf-8'));
            res.status(200).send(csv);
        }
        catch (error) {
            console.error('Erro ao exportar relatorio de colaboradores:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // GET /api/v1/relatorios/logistica-csv
    async exportarLogisticaCSV(req, res) {
        try {
            const db = (0, database_1.getDatabase)();
            const rows = await db.query(`
        SELECT
          o.codigo_rastreio,
          c.nome as colaborador_responsavel,
          o.origem,
          o.destino,
          o.status_operacao,
          o.data_prevista,
          o.created_at,
          o.updated_at
        FROM operacoes_logistica o
        LEFT JOIN colaboradores c ON o.colaborador_responsavel_id = c.id
        ORDER BY o.created_at DESC
      `);
            const headers = [
                'Codigo Rastreio',
                'Colaborador Responsavel',
                'Origem',
                'Destino',
                'Status Operacao',
                'Data Prevista',
                'Created At',
                'Updated At'
            ];
            const csv = this.buildCSV(headers, rows);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=relatorio_logistica.csv');
            res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf-8'));
            res.status(200).send(csv);
        }
        catch (error) {
            console.error('Erro ao exportar relatorio logistico:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
    // Constrói conteúdo CSV a partir de cabeçalhos e linhas
    buildCSV(headers, rows) {
        const escapeCSV = (value) => {
            if (value === null || value === undefined)
                return '';
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        const headerLine = headers.map(escapeCSV).join(',');
        const dataLines = rows.map(row => headers.map(h => escapeCSV(row[h] ?? row[h.toLowerCase()] ?? row[h.replace(/\s+/g, '_')] ?? '')).join(','));
        return [headerLine, ...dataLines].join('\n') + '\n';
    }
}
exports.RelatoriosController = RelatoriosController;
//# sourceMappingURL=relatorios.controller.js.map
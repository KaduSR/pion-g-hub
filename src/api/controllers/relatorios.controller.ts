// PionG Blueprint: Relatórios Controller
// Exportação de dados analíticos em CSV para colaboradores e logística
// Referencia: docs/piong-blueprint/03-mapa-funcional.md, 04-matriz-roles.md

import { Request, Response } from 'express';
import { getDatabase } from '../../shared/database';
import type { ApiResponse } from '../../shared/types/entities';

export class RelatoriosController {

  // GET /api/v1/relatorios/colaboradores-csv
  async exportarColaboradoresCSV(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();

      const rows = await db.query<any>(`
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
    } catch (error) {
      console.error('Erro ao exportar relatorio de colaboradores:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  // GET /api/v1/relatorios/logistica-csv
  async exportarLogisticaCSV(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();

      const rows = await db.query<any>(`
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
    } catch (error) {
      console.error('Erro ao exportar relatorio logistico:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  // Constrói conteúdo CSV a partir de cabeçalhos e linhas
  private buildCSV(headers: string[], rows: any[]): string {
    const escapeCSV = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = headers.map(escapeCSV).join(',');
    const dataLines = rows.map(row =>
      headers.map(h => escapeCSV(row[h] ?? row[h.toLowerCase()] ?? row[h.replace(/\s+/g, '_')] ?? '')).join(',')
    );

    return [headerLine, ...dataLines].join('\n') + '\n';
  }
}

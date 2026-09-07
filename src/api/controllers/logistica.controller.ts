import { Request, Response } from 'express';
import { getDatabase } from '../../shared/database';
import type { ApiResponse } from '../../shared/types/entities';

export class LogisticaController {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const rows = await db.query<any>(`
        SELECT o.id, o.codigo_rastreio, o.origem, o.destino,
               o.status_operacao, o.data_prevista, o.created_at,
               c.id as colaborador_id, c.nome as colaborador_nome
        FROM operacoes_logistica o
        LEFT JOIN colaboradores c ON o.colaborador_responsavel_id = c.id
        ORDER BY o.created_at DESC
      `);
      res.json({ success: true, data: rows } as ApiResponse<any[]>);
    } catch (error) {
      console.error('Erro ao listar logistica:', error);
      res.status(500).json({ success: false, error: 'Erro interno' } as ApiResponse<null>);
    }
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();
      const rows = await db.query<any>(`
        SELECT o.*, c.nome as colaborador_nome
        FROM operacoes_logistica o
        LEFT JOIN colaboradores c ON o.colaborador_responsavel_id = c.id
        WHERE o.id = $1
      `, [id]);
      if (rows.length === 0) { res.status(404).json({ success: false, error: 'Nao encontrada' } as ApiResponse<null>); return; }
      res.json({ success: true, data: rows[0] } as ApiResponse<any>);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Erro interno' } as ApiResponse<null>);
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const { codigo_rastreio, colaborador_responsavel_id, origem, destino, status_operacao, data_prevista } = req.body;
      if (!codigo_rastreio || !origem || !destino) {
        res.status(400).json({ success: false, error: 'codigo_rastreio, origem e destino obrigatorios' } as ApiResponse<null>); return;
      }
      const db = getDatabase();
      const rows = await db.query<any>(`
        INSERT INTO operacoes_logistica (codigo_rastreio, colaborador_responsavel_id, origem, destino, status_operacao, data_prevista)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING id, codigo_rastreio, colaborador_responsavel_id, origem, destino, status_operacao, data_prevista
      `, [codigo_rastreio, colaborador_responsavel_id || null, origem, destino, status_operacao || 'Pendente', data_prevista || null]);
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse<any>);
    } catch (error: any) {
      if (error.code === '23505') { res.status(409).json({ success: false, error: 'Codigo rastreio duplicado' } as ApiResponse<null>); return; }
      res.status(500).json({ success: false, error: 'Erro interno' } as ApiResponse<null>);
    }
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { codigo_rastreio, colaborador_responsavel_id, origem, destino, status_operacao, data_prevista } = req.body;
      const db = getDatabase();
      const rows = await db.query<any>(`
        UPDATE operacoes_logistica SET
          codigo_rastreio = COALESCE($1, codigo_rastreio),
          colaborador_responsavel_id = COALESCE($2, colaborador_responsavel_id),
          origem = COALESCE($3, origem),
          destino = COALESCE($4, destino),
          status_operacao = COALESCE($5, status_operacao),
          data_prevista = COALESCE($6, data_prevista),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7 RETURNING *
      `, [codigo_rastreio || null, colaborador_responsavel_id || null, origem || null, destino || null, status_operacao || null, data_prevista || null, id]);
      if (rows.length === 0) { res.status(404).json({ success: false, error: 'Nao encontrada' } as ApiResponse<null>); return; }
      res.json({ success: true, data: rows[0] } as ApiResponse<any>);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Erro interno' } as ApiResponse<null>);
    }
  }

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();
      await db.query(`DELETE FROM operacoes_logistica WHERE id = $1`, [id]);
      res.json({ success: true, message: 'Excluido' } as ApiResponse<null>);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Erro interno' } as ApiResponse<null>);
    }
  }
}

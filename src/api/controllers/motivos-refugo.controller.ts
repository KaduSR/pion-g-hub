import { Request, Response } from 'express';
import { getDatabase } from '../../shared/database';
import type { ApiResponse } from '../../shared/types/entities';

export class MotivosRefugoController {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const rows = await db.query<any>(`
        SELECT codigo, descricao, tipo, status
        FROM motivos_refugo
        ORDER BY codigo
      `);
      res.json({ success: true, data: rows } as ApiResponse<any[]>);
    } catch (error) {
      console.error('Erro ao listar motivos:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const { codigo } = req.params;
      const db = getDatabase();
      const rows = await db.query<any>(`
        SELECT codigo, descricao, tipo, status
        FROM motivos_refugo
        WHERE codigo = $1
      `, [codigo]);

      if (rows.length === 0) {
        res.status(404).json({ success: false, error: 'Motivo nao encontrado' } as ApiResponse<null>);
        return;
      }

      res.json({ success: true, data: rows[0] } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao buscar motivo:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const { codigo, descricao, tipo, status } = req.body;

      if (!codigo || !descricao || !tipo) {
        res.status(400).json({ success: false, error: 'Codigo, descricao e tipo sao obrigatorios' } as ApiResponse<null>);
        return;
      }

      const db = getDatabase();
      const rows = await db.query<any>(`
        INSERT INTO motivos_refugo (codigo, descricao, tipo, status)
        VALUES ($1, $2, $3, $4)
        RETURNING codigo, descricao, tipo, status
      `, [codigo, descricao, tipo, status ?? 'Ativo']);

      res.status(201).json({ success: true, data: rows[0] } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao criar motivo:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const { codigo } = req.params;
      const { descricao, tipo, status } = req.body;

      if (!descricao && !tipo && !status) {
        res.status(400).json({ success: false, error: 'Pelo menos um campo deve ser fornecido' } as ApiResponse<null>);
        return;
      }

      const db = getDatabase();
      const rows = await db.query<any>(`
        UPDATE motivos_refugo
        SET descricao = COALESCE($1, descricao),
            tipo = COALESCE($2, tipo),
            status = COALESCE($3, status)
        WHERE codigo = $4
        RETURNING codigo, descricao, tipo, status
      `, [descricao || null, tipo || null, status || null, codigo]);

      if (rows.length === 0) {
        res.status(404).json({ success: false, error: 'Motivo nao encontrado' } as ApiResponse<null>);
        return;
      }

      res.json({ success: true, data: rows[0], message: 'Motivo atualizado com sucesso' } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao atualizar motivo:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const { codigo } = req.params;
      const db = getDatabase();
      await db.query(`DELETE FROM motivos_refugo WHERE codigo = $1`, [codigo]);

      res.json({ success: true, message: 'Motivo excluido com sucesso' } as ApiResponse<null>);
    } catch (error) {
      console.error('Erro ao excluir motivo:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }
}

// PionG Blueprint: Areas Controller
// Endpoints CRUD para entidade Areas

import { Request, Response } from 'express';
import { getDatabase } from '../../shared/database';
import type { ApiResponse } from '../../shared/types/entities';

export class AreasController {
  // GET /api/areas - Listar todas as areas
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const rows = await db.query<any>(`
        SELECT id, descricao, descricao_curta, status
        FROM areas
        ORDER BY descricao
      `);
      res.json({ success: true, data: rows } as ApiResponse<any[]>);
    } catch (error) {
      console.error('Erro ao listar areas:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  // GET /api/areas/:id - Buscar area por ID
  async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();
      const rows = await db.query<any>(`
        SELECT id, descricao, descricao_curta, status
        FROM areas
        WHERE id = $1
      `, [id]);

      if (rows.length === 0) {
        res.status(404).json({ success: false, error: 'Area nao encontrada' } as ApiResponse<null>);
        return;
      }

      res.json({ success: true, data: rows[0] } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao buscar area:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  // POST /api/areas - Criar nova area
  async criar(req: Request, res: Response): Promise<void> {
    try {
      const { descricao, descricao_curta, status } = req.body;

      if (!descricao || !descricao_curta) {
        res.status(400).json({ success: false, error: 'Descricao e descricao_curta sao obrigatorios' } as ApiResponse<null>);
        return;
      }

      const db = getDatabase();
      const rows = await db.query<any>(`
        INSERT INTO areas (descricao, descricao_curta, status)
        VALUES ($1, $2, $3)
        RETURNING id, descricao, descricao_curta, status
      `, [descricao, descricao_curta, status ?? 'Ativo']);

      res.status(201).json({ success: true, data: rows[0] } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao criar area:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  // PUT /api/areas/:id - Atualizar area
  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { descricao, descricao_curta, status } = req.body;

      if (!descricao && !descricao_curta && !status) {
        res.status(400).json({ success: false, error: 'Pelo menos um campo deve ser fornecido' } as ApiResponse<null>);
        return;
      }

      const db = getDatabase();
      const rows = await db.query<any>(`
        UPDATE areas
        SET descricao = COALESCE($1, descricao),
            descricao_curta = COALESCE($2, descricao_curta),
            status = COALESCE($3, status)
        WHERE id = $4
        RETURNING id, descricao, descricao_curta, status
      `, [descricao || null, descricao_curta || null, status || null, id]);

      if (rows.length === 0) {
        res.status(404).json({ success: false, error: 'Area nao encontrada' } as ApiResponse<null>);
        return;
      }

      res.json({ success: true, data: rows[0], message: 'Area atualizada com sucesso' } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao atualizar area:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  // DELETE /api/areas/:id - Excluir area
  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();
      const result = await db.query(`DELETE FROM areas WHERE id = $1`, [id]);

      res.json({ success: true, message: 'Area excluida com sucesso' } as ApiResponse<null>);
    } catch (error) {
      console.error('Erro ao excluir area:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }
}

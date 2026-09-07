// PionG Blueprint: Setores Controller
// Endpoints CRUD para entidade Setores
// Referencia: docs/piong-blueprint/09-backlog-priorizado.md - secao 9.3 Setores

import { Request, Response } from 'express';
import { getDatabase } from '../../shared/database';
import type { ApiResponse } from '../../shared/types/entities';

export class SetoresController {
  // GET /api/v1/setores - Listar todos os setores
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const rows = await db.query<any>(`
        SELECT id, descricao, descricao_curta, status
        FROM setores
        ORDER BY descricao
      `);
      res.json({ success: true, data: rows } as ApiResponse<any[]>);
    } catch (error) {
      console.error('Erro ao listar setores:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  // GET /api/v1/setores/:id - Buscar setor por ID
  async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();
      const rows = await db.query<any>(`
        SELECT id, descricao, descricao_curta, status
        FROM setores
        WHERE id = $1
      `, [id]);

      if (rows.length === 0) {
        res.status(404).json({ success: false, error: 'Setor nao encontrado' } as ApiResponse<null>);
        return;
      }

      res.json({ success: true, data: rows[0] } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao buscar setor:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  // POST /api/v1/setores - Criar novo setor
  async criar(req: Request, res: Response): Promise<void> {
    try {
      const { descricao, descricao_curta, status } = req.body;

      if (!descricao || !descricao_curta) {
        res.status(400).json({ success: false, error: 'Descricao e descricao_curta sao obrigatorios' } as ApiResponse<null>);
        return;
      }

      const db = getDatabase();
      const rows = await db.query<any>(`
        INSERT INTO setores (descricao, descricao_curta, status)
        VALUES ($1, $2, $3)
        RETURNING id, descricao, descricao_curta, status
      `, [descricao, descricao_curta, status ?? 'Ativo']);

      res.status(201).json({ success: true, data: rows[0] } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao criar setor:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  // PUT /api/v1/setores/:id - Atualizar setor
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
        UPDATE setores
        SET descricao = COALESCE($1, descricao),
            descricao_curta = COALESCE($2, descricao_curta),
            status = COALESCE($3, status)
        WHERE id = $4
        RETURNING id, descricao, descricao_curta, status
      `, [descricao || null, descricao_curta || null, status || null, id]);

      if (rows.length === 0) {
        res.status(404).json({ success: false, error: 'Setor nao encontrado' } as ApiResponse<null>);
        return;
      }

      res.json({ success: true, data: rows[0], message: 'Setor atualizado com sucesso' } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao atualizar setor:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  // DELETE /api/v1/setores/:id - Excluir setor
  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();
      await db.query(`DELETE FROM setores WHERE id = $1`, [id]);

      res.json({ success: true, message: 'Setor excluido com sucesso' } as ApiResponse<null>);
    } catch (error) {
      console.error('Erro ao excluir setor:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }
}
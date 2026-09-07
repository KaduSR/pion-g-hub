import { Request, Response } from 'express';
import { getDatabase } from '../../shared/database';
import type { ApiResponse } from '../../shared/types/entities';

export class DefeitosRefugoController {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const rows = await db.query<any>(`
        SELECT codigo, descricao, setores_precos, custo_base, status
        FROM defeitos_refugo
        ORDER BY codigo
      `);
      res.json({ success: true, data: rows } as ApiResponse<any[]>);
    } catch (error) {
      console.error('Erro ao listar defeitos:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const { codigo } = req.params;
      const db = getDatabase();
      const rows = await db.query<any>(`
        SELECT codigo, descricao, setores_precos, custo_base, status
        FROM defeitos_refugo
        WHERE codigo = $1
      `, [codigo]);

      if (rows.length === 0) {
        res.status(404).json({ success: false, error: 'Defeito nao encontrado' } as ApiResponse<null>);
        return;
      }

      res.json({ success: true, data: rows[0] } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao buscar defeito:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const { codigo, descricao, setores_precos, custo_base, status } = req.body;

      if (!codigo || !descricao) {
        res.status(400).json({ success: false, error: 'Codigo e descricao sao obrigatorios' } as ApiResponse<null>);
        return;
      }

      const db = getDatabase();
      const rows = await db.query<any>(`
        INSERT INTO defeitos_refugo (codigo, descricao, setores_precos, custo_base, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING codigo, descricao, setores_precos, custo_base, status
      `, [codigo, descricao, setores_precos ?? null, custo_base ?? 0.00, status ?? 'Ativo']);

      res.status(201).json({ success: true, data: rows[0] } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao criar defeito:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const { codigo } = req.params;
      const { descricao, setores_precos, custo_base, status } = req.body;

      if (!descricao && !setores_precos && !custo_base && !status) {
        res.status(400).json({ success: false, error: 'Pelo menos um campo deve ser fornecido' } as ApiResponse<null>);
        return;
      }

      const db = getDatabase();
      const rows = await db.query<any>(`
        UPDATE defeitos_refugo
        SET descricao = COALESCE($1, descricao),
            setores_precos = COALESCE($2, setores_precos),
            custo_base = COALESCE($3, custo_base),
            status = COALESCE($4, status)
        WHERE codigo = $5
        RETURNING codigo, descricao, setores_precos, custo_base, status
      `, [descricao || null, setores_precos || null, custo_base || null, status || null, codigo]);

      if (rows.length === 0) {
        res.status(404).json({ success: false, error: 'Defeito nao encontrado' } as ApiResponse<null>);
        return;
      }

      res.json({ success: true, data: rows[0], message: 'Defeito atualizado com sucesso' } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao atualizar defeito:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const { codigo } = req.params;
      const db = getDatabase();
      await db.query(`DELETE FROM defeitos_refugo WHERE codigo = $1`, [codigo]);

      res.json({ success: true, message: 'Defeito excluido com sucesso' } as ApiResponse<null>);
    } catch (error) {
      console.error('Erro ao excluir defeito:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }
}

import { Request, Response } from 'express';
import { getDatabase } from '../../shared/database';
import type { ApiResponse } from '../../shared/types/entities';

export interface IPonto {
  id: string;
  colaborador_id: string;
  data_registro: string;
  hora_entrada?: string;
  hora_saida?: string;
  tipo_registro: string;
  observacao?: string;
  colaborador_nome?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class PontosController {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const rows = await db.query<IPonto>(`
        SELECT p.id, p.colaborador_id, p.data_registro,
               p.hora_entrada, p.hora_saida, p.tipo_registro,
               p.observacao,
               c.nome as colaborador_nome,
               p.created_at, p.updated_at
        FROM controle_ponto p
        LEFT JOIN colaboradores c ON p.colaborador_id = c.id
        ORDER BY p.data_registro DESC, c.nome
      `);
      res.json({ success: true, data: rows } as ApiResponse<IPonto[]>);
    } catch (error) {
      console.error('Erro ao listar pontos:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();
      const rows = await db.query<IPonto>(`
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
        res.status(404).json({ success: false, error: 'Registro de ponto nao encontrado' } as ApiResponse<null>);
        return;
      }
      res.json({ success: true, data: rows[0] } as ApiResponse<IPonto>);
    } catch (error) {
      console.error('Erro ao buscar ponto:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const { colaborador_id, data_registro, hora_entrada, hora_saida, tipo_registro, observacao } = req.body;
      if (!colaborador_id || !data_registro) {
        res.status(400).json({ success: false, error: 'colaborador_id e data_registro sao obrigatorios' } as ApiResponse<null>);
        return;
      }
      const db = getDatabase();
      const rows = await db.query<IPonto>(`
        INSERT INTO controle_ponto (colaborador_id, data_registro, hora_entrada, hora_saida, tipo_registro, observacao)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, colaborador_id, data_registro, hora_entrada, hora_saida, tipo_registro, observacao
      `, [colaborador_id, data_registro, hora_entrada || null, hora_saida || null, tipo_registro || 'Normal', observacao || null]);
      res.status(201).json({ success: true, data: rows[0], message: 'Registro de ponto criado com sucesso' } as ApiResponse<IPonto>);
    } catch (error) {
      console.error('Erro ao criar ponto:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { colaborador_id, data_registro, hora_entrada, hora_saida, tipo_registro, observacao } = req.body;
      if (!colaborador_id && !data_registro && !hora_entrada && !hora_saida && !tipo_registro && !observacao) {
        res.status(400).json({ success: false, error: 'Pelo menos um campo deve ser fornecido' } as ApiResponse<null>);
        return;
      }
      const db = getDatabase();
      const rows = await db.query<IPonto>(`
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
        res.status(404).json({ success: false, error: 'Registro de ponto nao encontrado' } as ApiResponse<null>);
        return;
      }
      res.json({ success: true, data: rows[0], message: 'Registro de ponto atualizado com sucesso' } as ApiResponse<IPonto>);
    } catch (error) {
      console.error('Erro ao atualizar ponto:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();
      await db.query(`DELETE FROM controle_ponto WHERE id = $1`, [id]);
      res.json({ success: true, message: 'Registro de ponto excluido com sucesso' } as ApiResponse<null>);
    } catch (error) {
      console.error('Erro ao excluir ponto:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' } as ApiResponse<null>);
    }
  }
}
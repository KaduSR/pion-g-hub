import { Request, Response } from 'express';
import { getDatabase } from '../../shared/database';
import type { ApiResponse } from '../../shared/types/entities';

export class DashboardController {
  async metrics(_req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const colaboradores = await db.query<any>(`
        SELECT status, COUNT(*) as total FROM colaboradores GROUP BY status
      `);
      const logistica = await db.query<any>(`
        SELECT status_operacao, COUNT(*) as total FROM operacoes_logistica GROUP BY status_operacao
      `);
      const pontoHoje = await db.query<any>(`
        SELECT COUNT(*) as total FROM controle_ponto WHERE data_registro = CURRENT_DATE
      `);
      const escalasMes = await db.query<any>(`
        SELECT COUNT(*) as total FROM escala_mes WHERE EXTRACT(MONTH FROM data_escala) = EXTRACT(MONTH FROM CURRENT_DATE)
      `);
      res.json({
        success: true,
        data: {
          colaboradores,
          logistica,
          pontoHoje: pontoHoje[0]?.total || 0,
          escalasMes: escalasMes[0]?.total || 0,
        }
      } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro dashboard:', error);
      res.status(500).json({ success: false, error: 'Erro interno' } as ApiResponse<null>);
    }
  }
}

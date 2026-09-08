// PionG Blueprint: Auditoria Controller
// Exposição de logs para fins de fiscalização administrativa
// Referencia: Governança e Auditoria de Sistema

import { Request, Response } from 'express';
import { getDatabase } from '../../shared/database';
import type { ApiResponse } from '../../shared/types/entities';

export class AuditoriaController {
    async listarLogs(req: Request, res: Response): Promise<void> {
        try {
            const db = getDatabase();

            // Limite de 100 logs recentes para performance
            const rows = await db.query(`
                SELECT
                    id,
                    ator_identificacao,
                    acao,
                    tabela_afetada,
                    registro_id,
                    detalhes,
                    criado_em
                FROM auditoria_logs
                ORDER BY criado_em DESC
                LIMIT 100
            `);

            res.status(200).json({
                success: true,
                data: rows
            } as ApiResponse<any[]>);
        } catch (error) {
            console.error('Erro ao listar logs de auditoria:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor ao recuperar logs'
            } as ApiResponse<null>);
        }
    }
}

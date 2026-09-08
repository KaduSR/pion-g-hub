// PionG Blueprint: Auditoria Service
// Utilitário centralizado para registro de eventos de auditoria
// Referencia: Governança e Auditoria de Sistema

import { getDatabase } from '../shared/database';

export interface IAuditLog {
    usuario_id?: string;
    ator_identificacao: string;
    acao: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'OTHER';
    tabela_afetada?: string;
    registro_id?: string;
    detalhes?: any;
    ip_address?: string;
}

export class AuditoriaService {
    static async registrar(log: IAuditLog): Promise<void> {
        try {
            const db = getDatabase();
            await db.query(
                `INSERT INTO auditoria_logs (usuario_id, ator_identificacao, acao, tabela_afetada, registro_id, detalhes, ip_address)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    log.usuario_id || null,
                    log.ator_identificacao,
                    log.acao,
                    log.tabela_afetada || null,
                    log.registro_id || null,
                    log.detalhes ? JSON.stringify(log.detalhes) : null,
                    log.ip_address || null
                ]
            );
        } catch (error) {
            // Logs de auditoria não devem derrubar a aplicação principal,
            // mas devem ser reportados no log do servidor
            console.error('[AUDITORIA_ERROR]: Falha ao registrar log de auditoria:', error);
        }
    }
}

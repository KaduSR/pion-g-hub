"use strict";
// PionG Blueprint: Auditoria Controller
// Exposição de logs para fins de fiscalização administrativa
// Referencia: Governança e Auditoria de Sistema
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditoriaController = void 0;
const database_1 = require("../../shared/database");
class AuditoriaController {
    async listarLogs(req, res) {
        try {
            const db = (0, database_1.getDatabase)();
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
            });
        }
        catch (error) {
            console.error('Erro ao listar logs de auditoria:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor ao recuperar logs'
            });
        }
    }
}
exports.AuditoriaController = AuditoriaController;
//# sourceMappingURL=auditoria.controller.js.map
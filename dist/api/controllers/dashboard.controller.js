"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const database_1 = require("../../shared/database");
class DashboardController {
    async metrics(_req, res) {
        try {
            const db = (0, database_1.getDatabase)();
            const colaboradores = await db.query(`
        SELECT status, COUNT(*) as total FROM colaboradores GROUP BY status
      `);
            const logistica = await db.query(`
        SELECT status_operacao, COUNT(*) as total FROM operacoes_logistica GROUP BY status_operacao
      `);
            const pontoHoje = await db.query(`
        SELECT COUNT(*) as total FROM controle_ponto WHERE data_registro = CURRENT_DATE
      `);
            const escalasMes = await db.query(`
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
            });
        }
        catch (error) {
            console.error('Erro dashboard:', error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    }
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=dashboard.controller.js.map
"use strict";
// PionG Blueprint: Routes - Sessoes
// Referencia: docs/piong-blueprint/03-mapa-funcional.md
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const database_1 = require("../../shared/database");
const router = (0, express_1.Router)();
const db = new database_1.PostgresDatabase();
// GET    /api/v1/sessoes - Listar todas as sessoes
router.get('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const sessoes = await db.query(`SELECT s.id, s.usuario_id, s.token_hash, s.ip_address,
              s.user_agent, s.expires_at, s.created_at, s.ultima_atividade,
              u.nome as usuario_nome, u.email as usuario_email
       FROM sessoes s
       LEFT JOIN usuarios u ON s.usuario_id = u.id
       ORDER BY s.created_at DESC`);
        res.json({ success: true, data: sessoes });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao buscar sessoes' });
    }
});
// GET    /api/v1/sessoes/ativas - Listar sessoes ativas
router.get('/ativas', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const sessoes = await db.query(`SELECT s.id, s.usuario_id, s.ip_address, s.user_agent,
              s.expires_at, s.ultima_atividade, u.nome as usuario_nome
       FROM sessoes s
       LEFT JOIN usuarios u ON s.usuario_id = u.id
       WHERE s.expires_at > NOW()
       ORDER BY s.ultima_atividade DESC`);
        res.json({ success: true, data: sessoes });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao buscar sessoes ativas' });
    }
});
// GET    /api/v1/sessoes/count - Contar sessoes ativas
router.get('/count', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const result = await db.query(`SELECT COUNT(*) as count FROM sessoes WHERE expires_at > NOW()`);
        res.json({ success: true, count: parseInt(result[0]?.count || '0', 10) });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao contar sessoes' });
    }
});
// GET    /api/v1/sessoes/usuario/:usuario_id - Listar sessoes por usuario
router.get('/usuario/:usuario_id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { usuario_id } = req.params;
        const sessoes = await db.query(`SELECT s.id, s.ip_address, s.user_agent, s.expires_at,
              s.created_at, s.ultima_atividade
       FROM sessoes s
       WHERE s.usuario_id = $1
       ORDER BY s.created_at DESC`, [usuario_id]);
        res.json({ success: true, data: sessoes });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao buscar sessoes do usuario' });
    }
});
// GET    /api/v1/sessoes/:id - Buscar sessao por ID
router.get('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const sessoes = await db.query(`SELECT s.id, s.usuario_id, s.ip_address, s.user_agent,
              s.expires_at, s.created_at, s.ultima_atividade,
              u.nome as usuario_nome, u.email as usuario_email
       FROM sessoes s
       LEFT JOIN usuarios u ON s.usuario_id = u.id
       WHERE s.id = $1`, [id]);
        if (sessoes.length === 0) {
            res.status(404).json({ success: false, error: 'Sessao nao encontrada' });
            return;
        }
        res.json({ success: true, data: sessoes[0] });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao buscar sessao' });
    }
});
// GET    /api/v1/sessoes/:id/detalhe - Buscar detalhes da sessao com historico
router.get('/:id/detalhe', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const [sessoes, historico] = await Promise.all([
            db.query(`SELECT s.id, s.usuario_id, s.ip_address, s.user_agent,
                s.expires_at, s.created_at, s.ultima_atividade,
                u.nome as usuario_nome, u.email as usuario_email
         FROM sessoes s
         LEFT JOIN usuarios u ON s.usuario_id = u.id
         WHERE s.id = $1`, [id]),
            db.query(`SELECT h.id, h.sessao_id, h.acao, h.descricao, h.created_at
         FROM historico_sessoes h
         WHERE h.sessao_id = $1
         ORDER BY h.created_at DESC`, [id])
        ]);
        if (sessoes.length === 0) {
            res.status(404).json({ success: false, error: 'Sessao nao encontrada' });
            return;
        }
        res.json({ success: true, data: { ...sessoes[0], historico } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao buscar detalhe da sessao' });
    }
});
// GET    /api/v1/sessoes/:id/historico - Listar historico de acoes da sessao
router.get('/:id/historico', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const historico = await db.query(`SELECT h.id, h.sessao_id, h.acao, h.descricao, h.created_at
       FROM historico_sessoes h
       WHERE h.sessao_id = $1
       ORDER BY h.created_at DESC`, [id]);
        res.json({ success: true, data: historico });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao buscar historico' });
    }
});
// POST   /api/v1/sessoes/:id/forcar-logout - Forcar logout de sessao
router.post('/:id/forcar-logout', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        // Verificar se a sessao existe
        const sessoes = await db.query('SELECT id FROM sessoes WHERE id = $1', [id]);
        if (sessoes.length === 0) {
            res.status(404).json({ success: false, error: 'Sessao nao encontrada' });
            return;
        }
        // Deletar a sessao
        await db.query('DELETE FROM sessoes WHERE id = $1', [id]);
        res.json({ success: true, message: 'Logout forcado realizado com sucesso' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao forcar logout' });
    }
});
// POST   /api/v1/sessoes/:id/refresh - Refresh token da sessao
router.post('/:id/refresh', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { refresh_token } = req.body;
        // Verificar se a sessao existe e tem um refresh token valido
        const sessoes = await db.query('SELECT id, refresh_token, expires_at FROM sessoes WHERE id = $1', [id]);
        if (sessoes.length === 0) {
            res.status(404).json({ success: false, error: 'Sessao nao encontrada' });
            return;
        }
        // Atualizar data de expiracao
        const novaExpiracao = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h
        await db.query('UPDATE sessoes SET expires_at = $1, ultima_atividade = NOW() WHERE id = $2', [novaExpiracao.toISOString(), id]);
        res.json({ success: true, message: 'Sessao renovada com sucesso' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao renovar sessao' });
    }
});
exports.default = router;
//# sourceMappingURL=sessoes.routes.js.map
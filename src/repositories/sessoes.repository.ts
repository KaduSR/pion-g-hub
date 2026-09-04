// PionG Blueprint: Repository - Sessoes (Usuarios Online)
// Referencia: docs/piong-blueprint/03-mapa-funcional.md, docs/piong-blueprint/04-matriz-roles.md

import { Database } from '../shared/database';
import { Sessao, SessaoDetalhe, SessaoHistorico, SessaoFilters } from '../shared/types/entities';

export class SessoesRepository {
  constructor(private db: Database) {}

  private formatSessao(row: Record<string, unknown>): Sessao {
    const startedAt = new Date(row.started_at as string);
    const lastActivity = new Date(row.last_activity_at as string);
    const diffMs = lastActivity.getTime() - startedAt.getTime();

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let tempoOnline: string;
    if (days > 0) tempoOnline = `${days}d ${hours % 24}h`;
    else if (hours > 0) tempoOnline = `${hours}h ${minutes % 60}m`;
    else tempoOnline = `${minutes}m`;

    return {
      id: row.id as string,
      usuario_id: row.usuario_id as string,
      usuario_email: row.usuario_email as string,
      usuario_nome: row.usuario_nome as string,
      token_hash: row.token_hash as string,
      ip_address: row.ip_address as string | null,
      user_agent: row.user_agent as string | null,
      navegador: row.navegador as string | null,
      sistema_operacional: row.sistema_operacional as string | null,
      device_type: row.device_type as Sessao['device_type'],
      ip_geolocalizacao: row.ip_geolocalizacao as Sessao['ip_geolocalizacao'],
      started_at: startedAt,
      last_activity_at: lastActivity,
      expires_at: new Date(row.expires_at as string),
      status: row.status as Sessao['status'],
      forcada_por: row.forcada_por as string | null,
      forcada_em: row.forcada_em ? new Date(row.forcada_em as string) : null,
      created_at: new Date(row.created_at as string),
      tempo_online: tempoOnline
    };
  }

  async findAll(filters?: SessaoFilters): Promise<Sessao[]> {
    let query = `
      SELECT s.*,
        u.email as usuario_email,
        c.nome as usuario_nome
      FROM sessoes s
      JOIN usuarios u ON u.id = s.usuario_id
      LEFT JOIN colaboradores c ON c.id = u.colaborador_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      query += ` AND s.status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters?.usuario_id) {
      query += ` AND s.usuario_id = $${paramIndex++}`;
      params.push(filters.usuario_id);
    }

    if (filters?.data_inicio) {
      query += ` AND s.started_at >= $${paramIndex++}`;
      params.push(filters.data_inicio);
    }

    if (filters?.data_fim) {
      query += ` AND s.started_at <= $${paramIndex++}`;
      params.push(filters.data_fim);
    }

    query += ' ORDER BY s.last_activity_at DESC';

    const rows = await this.db.query<Record<string, unknown>>(query, params);
    return rows.map(row => this.formatSessao(row));
  }

  async findAtivas(): Promise<Sessao[]> {
    return this.findAll({ status: 'ativa' });
  }

  async findById(id: string): Promise<Sessao | null> {
    const query = `
      SELECT s.*,
        u.email as usuario_email,
        c.nome as usuario_nome
      FROM sessoes s
      JOIN usuarios u ON u.id = s.usuario_id
      LEFT JOIN colaboradores c ON c.id = u.colaborador_id
      WHERE s.id = $1
    `;
    const rows = await this.db.query<Record<string, unknown>>(query, [id]);
    return rows[0] ? this.formatSessao(rows[0]) : null;
  }

  async findByIdDetalhe(id: string): Promise<SessaoDetalhe | null> {
    const sessao = await this.findById(id);
    if (!sessao) return null;

    const historico = await this.getHistorico(id);
    return { ...sessao, historico };
  }

  async findByUsuario(usuarioId: string): Promise<Sessao[]> {
    return this.findAll({ usuario_id: usuarioId });
  }

  async countAtivas(): Promise<number> {
    const query = "SELECT COUNT(*) as count FROM sessoes WHERE status = 'ativa'";
    const result = await this.db.query<{ count: string }>(query);
    return parseInt(result[0]?.count || '0', 10);
  }

  async create(data: {
    usuario_id: string;
    token_hash: string;
    ip_address?: string;
    user_agent?: string;
    navegador?: string;
    sistema_operacional?: string;
    device_type?: string;
    expires_at: Date;
  }): Promise<Sessao> {
    const query = `
      INSERT INTO sessoes (
        usuario_id, token_hash, ip_address, user_agent,
        navegador, sistema_operacional, device_type, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [
      data.usuario_id,
      data.token_hash,
      data.ip_address || null,
      data.user_agent || null,
      data.navegador || null,
      data.sistema_operacional || null,
      data.device_type || 'unknown',
      data.expires_at
    ];
    const rows = await this.db.query<Record<string, unknown>>(query, params);
    return this.formatSessao(rows[0]);
  }

  async updateLastActivity(id: string): Promise<void> {
    const query = `
      UPDATE sessoes
      SET last_activity_at = now()
      WHERE id = $1 AND status = 'ativa'
    `;
    await this.db.query(query, [id]);
  }

  async updateStatus(id: string, status: Sessao['status'], forcadaPor?: string): Promise<Sessao | null> {
    let query: string;
    let params: unknown[];

    if (status === 'forcada' && forcadaPor) {
      query = `
        UPDATE sessoes
        SET status = $1, forcada_por = $2, forcada_em = now()
        WHERE id = $3
        RETURNING *
      `;
      params = [status, forcadaPor, id];
    } else {
      query = `
        UPDATE sessoes
        SET status = $1
        WHERE id = $2
        RETURNING *
      `;
      params = [status, id];
    }

    const rows = await this.db.query<Record<string, unknown>>(query, params);
    return rows[0] ? this.formatSessao(rows[0]) : null;
  }

  async marcarExpiradas(): Promise<number> {
    const query = `
      UPDATE sessoes
      SET status = 'expirada'
      WHERE status = 'ativa' AND expires_at < now()
      RETURNING id
    `;
    const result = await this.db.query(query);
    return result.length;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM sessoes WHERE id = $1 RETURNING id';
    const result = await this.db.query(query, [id]);
    return result.length > 0;
  }

  // ========== Historico ==========

  async getHistorico(sessaoId: string, limit = 100): Promise<SessaoHistorico[]> {
    const query = `
      SELECT *
      FROM sessoes_historico
      WHERE sessao_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    return this.db.query<SessaoHistorico>(query, [sessaoId, limit]);
  }

  async addHistorico(data: {
    sessao_id: string;
    acao?: string;
    modulo?: string;
    detalhes?: Record<string, unknown>;
    ip_address?: string;
  }): Promise<SessaoHistorico> {
    const query = `
      INSERT INTO sessoes_historico (sessao_id, acao, modulo, detalhes, ip_address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await this.db.query<SessaoHistorico>(query, [
      data.sessao_id,
      data.acao || null,
      data.modulo || null,
      data.detalhes ? JSON.stringify(data.detalhes) : null,
      data.ip_address || null
    ]);
    return result[0];
  }

  // ========== Utilidades ==========

  parseUserAgent(userAgent: string): { navegador: string; sistema_operacional: string; device_type: string } {
    let navegador = 'Desconhecido';
    let sistema_operacional = 'Desconhecido';
    let device_type = 'desktop';

    if (/mobile/i.test(userAgent)) device_type = 'mobile';
    else if (/tablet|ipad/i.test(userAgent)) device_type = 'tablet';

    if (/Edg\//i.test(userAgent)) navegador = 'Microsoft Edge';
    else if (/Chrome\/[^ ]/i.test(userAgent)) navegador = 'Google Chrome';
    else if (/Firefox\/[^ ]/i.test(userAgent)) navegador = 'Mozilla Firefox';
    else if (/Safari\/[^ ]/i.test(userAgent) && !/Chrome/i.test(userAgent)) navegador = 'Safari';
    else if (/MSIE|Trident/i.test(userAgent)) navegador = 'Internet Explorer';

    if (/Windows NT/i.test(userAgent)) sistema_operacional = 'Windows';
    else if (/Mac OS X/i.test(userAgent)) sistema_operacional = 'macOS';
    else if (/Linux/i.test(userAgent)) sistema_operacional = 'Linux';
    else if (/Android/i.test(userAgent)) sistema_operacional = 'Android';
    else if (/iPhone|iPad/i.test(userAgent)) sistema_operacional = 'iOS';

    return { navegador, sistema_operacional, device_type };
  }

  gerarTokenHash(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
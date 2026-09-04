// PionG Blueprint: Service - Sessoes (Usuarios Online)
// Referencia: docs/piong-blueprint/03-mapa-funcional.md, docs/piong-blueprint/04-matriz-roles.md

import { SessoesRepository } from '../repositories/sessoes.repository';
import { Sessao, SessaoDetalhe, SessaoFilters } from '../shared/types/entities';

export class SessoesService {
  constructor(private repository: SessoesRepository) {}

  async listar(filters?: SessaoFilters): Promise<Sessao[]> {
    // Primeiro marcar sessoes expiradas
    await this.repository.marcarExpiradas();
    return this.repository.findAll(filters);
  }

  async listarAtivas(): Promise<Sessao[]> {
    return this.repository.findAtivas();
  }

  async buscarPorId(id: string): Promise<Sessao | null> {
    return this.repository.findById(id);
  }

  async buscarDetalhe(id: string): Promise<SessaoDetalhe | null> {
    return this.repository.findByIdDetalhe(id);
  }

  async buscarPorUsuario(usuarioId: string): Promise<Sessao[]> {
    return this.repository.findByUsuario(usuarioId);
  }

  async countAtivas(): Promise<number> {
    return this.repository.countAtivas();
  }

  async forcarLogout(sessaoId: string, adminId: string): Promise<Sessao> {
    const sessao = await this.repository.findById(sessaoId);
    if (!sessao) {
      throw new Error('Sessao nao encontrada');
    }

    if (sessao.status !== 'ativa') {
      throw new Error('Sessao ja esta inativa ou expirada');
    }

    // Verificar se admin tem permissao
    // A verificacao de nivel hierarquico >= 80 deve ser feita no controller/middleware

    const atualizada = await this.repository.updateStatus(sessaoId, 'forcada', adminId);
    if (!atualizada) {
      throw new Error('Falha ao forcar logout');
    }

    // Registrar no historico
    await this.repository.addHistorico({
      sessao_id: sessaoId,
      acao: 'logout_forcado',
      modulo: 'admin.usuarios_online',
      detalhes: { admin_id: adminId },
      ip_address: 'sistema'
    });

    return atualizada;
  }

  async criarSessao(data: {
    usuario_id: string;
    ip_address?: string;
    user_agent?: string;
  }): Promise<Sessao> {
    const tokenHash = this.repository.gerarTokenHash();
    const { navegador, sistema_operacional, device_type } = this.repository.parseUserAgent(
      data.user_agent || ''
    );

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hora

    return this.repository.create({
      usuario_id: data.usuario_id,
      token_hash: tokenHash,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      navegador,
      sistema_operacional,
      device_type,
      expires_at: expiresAt
    });
  }

  async refreshSessao(sessaoId: string): Promise<Sessao> {
    const sessao = await this.repository.findById(sessaoId);
    if (!sessao) {
      throw new Error('Sessao nao encontrada');
    }

    if (sessao.status !== 'ativa') {
      throw new Error('Nao e possivel atualizar sessao inativa');
    }

    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + 1);

    // Atualizar status
    await this.repository.updateStatus(sessaoId, 'ativa');

    return this.repository.findById(sessaoId) as Promise<Sessao>;
  }

  async registrarAtividade(sessaoId: string, acao: string, modulo: string, ipAddress?: string): Promise<void> {
    await this.repository.updateLastActivity(sessaoId);
    await this.repository.addHistorico({
      sessao_id: sessaoId,
      acao,
      modulo,
      ip_address: ipAddress
    });
  }

  async getHistorico(sessaoId: string, limit = 100): Promise<unknown[]> {
    return this.repository.getHistorico(sessaoId, limit);
  }

  async encerrarSessao(sessaoId: string): Promise<void> {
    await this.repository.updateStatus(sessaoId, 'inativa');
  }
}
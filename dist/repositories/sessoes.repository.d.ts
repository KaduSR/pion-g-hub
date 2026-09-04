import { Database } from '../shared/database';
import { Sessao, SessaoDetalhe, SessaoHistorico, SessaoFilters } from '../shared/types/entities';
export declare class SessoesRepository {
    private db;
    constructor(db: Database);
    private formatSessao;
    findAll(filters?: SessaoFilters): Promise<Sessao[]>;
    findAtivas(): Promise<Sessao[]>;
    findById(id: string): Promise<Sessao | null>;
    findByIdDetalhe(id: string): Promise<SessaoDetalhe | null>;
    findByUsuario(usuarioId: string): Promise<Sessao[]>;
    countAtivas(): Promise<number>;
    create(data: {
        usuario_id: string;
        token_hash: string;
        ip_address?: string;
        user_agent?: string;
        navegador?: string;
        sistema_operacional?: string;
        device_type?: string;
        expires_at: Date;
    }): Promise<Sessao>;
    updateLastActivity(id: string): Promise<void>;
    updateStatus(id: string, status: Sessao['status'], forcadaPor?: string): Promise<Sessao | null>;
    marcarExpiradas(): Promise<number>;
    delete(id: string): Promise<boolean>;
    getHistorico(sessaoId: string, limit?: number): Promise<SessaoHistorico[]>;
    addHistorico(data: {
        sessao_id: string;
        acao?: string;
        modulo?: string;
        detalhes?: Record<string, unknown>;
        ip_address?: string;
    }): Promise<SessaoHistorico>;
    parseUserAgent(userAgent: string): {
        navegador: string;
        sistema_operacional: string;
        device_type: string;
    };
    gerarTokenHash(): string;
}
//# sourceMappingURL=sessoes.repository.d.ts.map
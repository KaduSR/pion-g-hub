import { SessoesRepository } from '../repositories/sessoes.repository';
import { Sessao, SessaoDetalhe, SessaoFilters } from '../shared/types/entities';
export declare class SessoesService {
    private repository;
    constructor(repository: SessoesRepository);
    listar(filters?: SessaoFilters): Promise<Sessao[]>;
    listarAtivas(): Promise<Sessao[]>;
    buscarPorId(id: string): Promise<Sessao | null>;
    buscarDetalhe(id: string): Promise<SessaoDetalhe | null>;
    buscarPorUsuario(usuarioId: string): Promise<Sessao[]>;
    countAtivas(): Promise<number>;
    forcarLogout(sessaoId: string, adminId: string): Promise<Sessao>;
    criarSessao(data: {
        usuario_id: string;
        ip_address?: string;
        user_agent?: string;
    }): Promise<Sessao>;
    refreshSessao(sessaoId: string): Promise<Sessao>;
    registrarAtividade(sessaoId: string, acao: string, modulo: string, ipAddress?: string): Promise<void>;
    getHistorico(sessaoId: string, limit?: number): Promise<unknown[]>;
    encerrarSessao(sessaoId: string): Promise<void>;
}
//# sourceMappingURL=sessoes.service.d.ts.map
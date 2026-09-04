import { PerfisRepository } from '../repositories/perfis.repository';
export declare class PerfisService {
    private repository;
    constructor(repository: PerfisRepository);
    listar(): Promise<any[]>;
    buscarPorId(id: string): Promise<any | null>;
    criar(data: any): Promise<any>;
    atualizar(id: string, data: any): Promise<boolean>;
    excluir(id: string): Promise<boolean>;
    listarPermissoes(perfilId: string): Promise<any[]>;
    atualizarPermissoes(perfilId: string, permissoes: any[]): Promise<boolean>;
}
//# sourceMappingURL=perfis.service.d.ts.map
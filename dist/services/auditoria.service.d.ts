export interface IAuditLog {
    usuario_id?: string;
    ator_identificacao: string;
    acao: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'OTHER';
    tabela_afetada?: string;
    registro_id?: string;
    detalhes?: any;
    ip_address?: string;
}
export declare class AuditoriaService {
    static registrar(log: IAuditLog): Promise<void>;
}
//# sourceMappingURL=auditoria.service.d.ts.map
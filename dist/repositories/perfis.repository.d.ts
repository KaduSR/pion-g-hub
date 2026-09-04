export declare class PerfisRepository {
    private database;
    constructor(database: any);
    findAll(): Promise<any[]>;
    findById(id: string): Promise<any | null>;
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<boolean>;
    delete(id: string): Promise<boolean>;
    findPermissoesByPerfilId(perfilId: string): Promise<any[]>;
    updatePermissoes(perfilId: string, permissoes: any[]): Promise<boolean>;
}
//# sourceMappingURL=perfis.repository.d.ts.map
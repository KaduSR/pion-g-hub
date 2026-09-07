import type { IArea, IDepartamento, ISetor, ICargo, IMotivoRefugo, IDefeitoRefugo } from '../../../shared/types/cadastros';
export interface CadastrosFilters {
    busca?: string;
    status?: boolean;
}
export declare const cadastrosService: {
    getAreas(filters?: CadastrosFilters): Promise<IArea[]>;
    getAreaById(id: string): Promise<IArea | null>;
    createArea(area: Omit<IArea, "id">): Promise<IArea>;
    updateArea(id: string, area: Partial<IArea>): Promise<IArea>;
    deleteArea(id: string): Promise<void>;
    getDepartamentos(filters?: CadastrosFilters): Promise<IDepartamento[]>;
    getDepartamentoById(id: string): Promise<IDepartamento | null>;
    createDepartamento(departamento: Omit<IDepartamento, "id">): Promise<IDepartamento>;
    updateDepartamento(id: string, departamento: Partial<IDepartamento>): Promise<IDepartamento>;
    deleteDepartamento(id: string): Promise<void>;
    getSetores(filters?: CadastrosFilters): Promise<ISetor[]>;
    getSetorById(id: string): Promise<ISetor | null>;
    createSetor(setor: Omit<ISetor, "id">): Promise<ISetor>;
    updateSetor(id: string, setor: Partial<ISetor>): Promise<ISetor>;
    deleteSetor(id: string): Promise<void>;
    getCargos(filters?: CadastrosFilters): Promise<ICargo[]>;
    getCargoById(id: string): Promise<ICargo | null>;
    createCargo(cargo: Omit<ICargo, "id">): Promise<ICargo>;
    updateCargo(id: string, cargo: Partial<ICargo>): Promise<ICargo>;
    deleteCargo(id: string): Promise<void>;
    getMotivosRefugo(filters?: CadastrosFilters): Promise<IMotivoRefugo[]>;
    getMotivoRefugoById(id: string): Promise<IMotivoRefugo | null>;
    createMotivoRefugo(motivo: Omit<IMotivoRefugo, "id">): Promise<IMotivoRefugo>;
    updateMotivoRefugo(id: string, motivo: Partial<IMotivoRefugo>): Promise<IMotivoRefugo>;
    deleteMotivoRefugo(id: string): Promise<void>;
    getDefeitosRefugo(filters?: CadastrosFilters): Promise<IDefeitoRefugo[]>;
    getDefeitoRefugoById(id: string): Promise<IDefeitoRefugo | null>;
    createDefeitoRefugo(defeito: Omit<IDefeitoRefugo, "id">): Promise<IDefeitoRefugo>;
    updateDefeitoRefugo(id: string, defeito: Partial<IDefeitoRefugo>): Promise<IDefeitoRefugo>;
    deleteDefeitoRefugo(id: string): Promise<void>;
};
export default cadastrosService;
//# sourceMappingURL=cadastros.service.d.ts.map
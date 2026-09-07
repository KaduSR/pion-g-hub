import { Request, Response } from 'express';
export interface IEscala {
    id: string;
    colaborador_id: string;
    data_escala: string;
    turno: string;
    status: string;
    colaborador_nome?: string;
    created_at?: Date;
    updated_at?: Date;
}
export declare class EscalasController {
    listar(_req: Request, res: Response): Promise<void>;
    buscarPorId(req: Request, res: Response): Promise<void>;
    criar(req: Request, res: Response): Promise<void>;
    atualizar(req: Request, res: Response): Promise<void>;
    excluir(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=escalas.controller.d.ts.map
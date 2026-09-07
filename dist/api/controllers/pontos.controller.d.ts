import { Request, Response } from 'express';
export interface IPonto {
    id: string;
    colaborador_id: string;
    data_registro: string;
    hora_entrada?: string;
    hora_saida?: string;
    tipo_registro: string;
    observacao?: string;
    colaborador_nome?: string;
    created_at?: Date;
    updated_at?: Date;
}
export declare class PontosController {
    listar(_req: Request, res: Response): Promise<void>;
    buscarPorId(req: Request, res: Response): Promise<void>;
    criar(req: Request, res: Response): Promise<void>;
    atualizar(req: Request, res: Response): Promise<void>;
    excluir(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=pontos.controller.d.ts.map
import { Request, Response } from 'express';
export interface IColaborador {
    id: string;
    nome: string;
    matricula: string;
    cpf: string;
    cargo_id: string;
    departamento_id: string;
    status: string;
    cargo_nome?: string;
    departamento_nome?: string;
    created_at: Date;
    updated_at: Date;
}
export declare class ColaboradoresController {
    listar(_req: Request, res: Response): Promise<void>;
    buscarPorId(req: Request, res: Response): Promise<void>;
    criar(req: Request, res: Response): Promise<void>;
    atualizar(req: Request, res: Response): Promise<void>;
    excluir(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=colaboradores.controller.d.ts.map
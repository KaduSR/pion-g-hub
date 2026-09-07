import { Request, Response } from 'express';
export declare class PerfisController {
    private service?;
    constructor(service?: any | undefined);
    listar(req: Request, res: Response): Promise<void>;
    buscarPorId(req: Request, res: Response): Promise<void>;
    criar(req: Request, res: Response): Promise<void>;
    atualizar(req: Request, res: Response): Promise<void>;
    excluir(req: Request, res: Response): Promise<void>;
    duplicar(req: Request, res: Response): Promise<void>;
    getPermissoes(req: Request, res: Response): Promise<void>;
    atualizarPermissoes(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=perfis.controller.d.ts.map
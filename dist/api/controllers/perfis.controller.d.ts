import { Request, Response } from 'express';
import { PerfisService } from '../../services/perfis.service';
export declare class PerfisController {
    private service;
    constructor(service: PerfisService);
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
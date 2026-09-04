import { Request, Response } from 'express';
import { SessoesService } from '../../services/sessoes.service';
export declare class SessoesController {
    private service;
    constructor(service: SessoesService);
    listar(req: Request, res: Response): Promise<void>;
    listarAtivas(req: Request, res: Response): Promise<void>;
    buscarPorId(req: Request, res: Response): Promise<void>;
    buscarDetalhe(req: Request, res: Response): Promise<void>;
    buscarPorUsuario(req: Request, res: Response): Promise<void>;
    forcarLogout(req: Request, res: Response): Promise<void>;
    getHistorico(req: Request, res: Response): Promise<void>;
    countAtivas(req: Request, res: Response): Promise<void>;
    refreshToken(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=sessoes.controller.d.ts.map
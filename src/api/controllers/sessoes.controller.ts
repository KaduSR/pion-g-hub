// PionG Blueprint: Controller - Sessoes (Usuarios Online)
// Referencia: docs/piong-blueprint/03-mapa-funcional.md

import { Request, Response } from 'express';
import { SessoesService } from '../../services/sessoes.service';
import { SessaoFilters } from '../../shared/types/entities';

export class SessoesController {
  constructor(private service: SessoesService) {}

  async listar(req: Request, res: Response): Promise<void> {
    try {
      const filters: SessaoFilters = {
        status: req.query.status as SessaoFilters['status'] || undefined,
        usuario_id: req.query.usuario_id as string | undefined,
        data_inicio: req.query.data_inicio ? new Date(req.query.data_inicio as string) : undefined,
        data_fim: req.query.data_fim ? new Date(req.query.data_fim as string) : undefined
      };

      const sessoes = await this.service.listar(filters);
      res.json({ success: true, data: sessoes });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao listar sessoes';
      res.status(500).json({ success: false, error: message });
    }
  }

  async listarAtivas(req: Request, res: Response): Promise<void> {
    try {
      const sessoes = await this.service.listarAtivas();
      res.json({ success: true, data: sessoes });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao listar sessoes ativas';
      res.status(500).json({ success: false, error: message });
    }
  }

  async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const sessao = await this.service.buscarPorId(id);

      if (!sessao) {
        res.status(404).json({ success: false, error: 'Sessao nao encontrada' });
        return;
      }

      res.json({ success: true, data: sessao });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao buscar sessao';
      res.status(500).json({ success: false, error: message });
    }
  }

  async buscarDetalhe(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const sessao = await this.service.buscarDetalhe(id);

      if (!sessao) {
        res.status(404).json({ success: false, error: 'Sessao nao encontrada' });
        return;
      }

      res.json({ success: true, data: sessao });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao buscar detalhes da sessao';
      res.status(500).json({ success: false, error: message });
    }
  }

  async buscarPorUsuario(req: Request, res: Response): Promise<void> {
    try {
      const { usuario_id } = req.params;
      const sessoes = await this.service.buscarPorUsuario(usuario_id);
      res.json({ success: true, data: sessoes });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao buscar sessoes do usuario';
      res.status(500).json({ success: false, error: message });
    }
  }

  async forcarLogout(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = (req as Request & { user: { id: string } }).user.id;

      const sessao = await this.service.forcarLogout(id, adminId);
      res.json({ success: true, data: sessao, message: 'Logout forcado com sucesso' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao forcar logout';
      res.status(400).json({ success: false, error: message });
    }
  }

  async getHistorico(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

      const historico = await this.service.getHistorico(id, limit);
      res.json({ success: true, data: historico });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao buscar historico';
      res.status(500).json({ success: false, error: message });
    }
  }

  async countAtivas(req: Request, res: Response): Promise<void> {
    try {
      const count = await this.service.countAtivas();
      res.json({ success: true, data: { count } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao contar sessoes';
      res.status(500).json({ success: false, error: message });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const sessao = await this.service.refreshSessao(id);
      res.json({ success: true, data: sessao, message: 'Token atualizado com sucesso' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar token';
      res.status(400).json({ success: false, error: message });
    }
  }
}
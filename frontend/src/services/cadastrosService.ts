// Integracao real com API Express via HTTP
// Endpoints: /api/v1/areas e /api/v1/departamentos
// Autenticacao: JWT injetado automaticamente pelo cliente api.ts

import type { IArea, IDepartamento } from '../types/cadastros';
import { areasApi, departamentosApi } from '../shared/api';

export const cadastrosService = {
  // ========== AREAS ==========
  async getAreas(): Promise<IArea[]> {
    const data = await areasApi.listar();
    return data;
  },

  async getAreaById(id: string): Promise<IArea | null> {
    try {
      const data = await areasApi.buscarPorId(id);
      return data;
    } catch {
      return null;
    }
  },

  async createArea(area: Omit<IArea, 'id'>): Promise<IArea> {
    const data = await areasApi.criar({
      descricao: area.descricao,
      descricao_curta: area.descricao_curta,
      status: area.status,
    });
    return data;
  },

  async updateArea(id: string, area: Partial<IArea>): Promise<IArea> {
    const data = await areasApi.atualizar(id, {
      descricao: area.descricao,
      descricao_curta: area.descricao_curta,
      status: area.status,
    });
    return data;
  },

  async deleteArea(id: string): Promise<void> {
    await areasApi.excluir(id);
  },

  // ========== DEPARTAMENTOS ==========
  async getDepartamentos(): Promise<IDepartamento[]> {
    const data = await departamentosApi.listar();
    return data;
  },

  async getDepartamentoById(id: string): Promise<IDepartamento | null> {
    try {
      const data = await departamentosApi.buscarPorId(id);
      return data;
    } catch {
      return null;
    }
  },

  async createDepartamento(departamento: Omit<IDepartamento, 'id'>): Promise<IDepartamento> {
    const data = await departamentosApi.criar({
      descricao: departamento.descricao,
      descricao_curta: departamento.descricao_curta,
      status: departamento.status,
    });
    return data;
  },

  async updateDepartamento(id: string, departamento: Partial<IDepartamento>): Promise<IDepartamento> {
    const data = await departamentosApi.atualizar(id, {
      descricao: departamento.descricao,
      descricao_curta: departamento.descricao_curta,
      status: departamento.status,
    });
    return data;
  },

  async deleteDepartamento(id: string): Promise<void> {
    await departamentosApi.excluir(id);
  },
};

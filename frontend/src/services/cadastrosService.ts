// Integracao real com API Express via HTTP
// Endpoints: /api/v1/areas, /api/v1/departamentos, /api/v1/setores, /api/v1/cargos
// Autenticacao: JWT injetado automaticamente pelo cliente api.ts

import type { IArea, IDepartamento, ISetor, ICargo, IMotivoRefugo, IDefeitoRefugo } from '../types/cadastros';
import { areasApi, departamentosApi, setoresApi, cargosApi, motivosRefugoApi, defeitosRefugoApi } from '../shared/api';

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

  // ========== SETORES ==========
  async getSetores(): Promise<ISetor[]> {
    const data = await setoresApi.listar();
    return data;
  },

  async getSetorById(id: string): Promise<ISetor | null> {
    try {
      const data = await setoresApi.buscarPorId(id);
      return data;
    } catch {
      return null;
    }
  },

  async createSetor(setor: Omit<ISetor, 'id'>): Promise<ISetor> {
    const data = await setoresApi.criar({
      descricao: setor.descricao,
      descricao_curta: setor.descricao_curta,
      status: setor.status,
    });
    return data;
  },

  async updateSetor(id: string, setor: Partial<ISetor>): Promise<ISetor> {
    const data = await setoresApi.atualizar(id, {
      descricao: setor.descricao,
      descricao_curta: setor.descricao_curta,
      status: setor.status,
    });
    return data;
  },

  async deleteSetor(id: string): Promise<void> {
    await setoresApi.excluir(id);
  },

  // ========== CARGOS ==========
  async getCargos(): Promise<ICargo[]> {
    const data = await cargosApi.listar();
    return data;
  },

  async getCargoById(id: string): Promise<ICargo | null> {
    try {
      const data = await cargosApi.buscarPorId(id);
      return data;
    } catch {
      return null;
    }
  },

  async createCargo(cargo: Omit<ICargo, 'id'>): Promise<ICargo> {
    const data = await cargosApi.criar({
      descricao: cargo.descricao,
      descricao_curta: cargo.descricao_curta,
      status: cargo.status,
    });
    return data;
  },

  async updateCargo(id: string, cargo: Partial<ICargo>): Promise<ICargo> {
    const data = await cargosApi.atualizar(id, {
      descricao: cargo.descricao,
      descricao_curta: cargo.descricao_curta,
      status: cargo.status,
    });
    return data;
  },

  async deleteCargo(id: string): Promise<void> {
    await cargosApi.excluir(id);
  },

  // ========== MOTIVOS DE REFUGO ==========
  async getMotivosRefugo(): Promise<IMotivoRefugo[]> {
    const data = await motivosRefugoApi.listar();
    return data;
  },

  async getMotivoRefugoByCodigo(codigo: string): Promise<IMotivoRefugo | null> {
    try {
      const data = await motivosRefugoApi.buscarPorId(codigo);
      return data;
    } catch {
      return null;
    }
  },

  async createMotivoRefugo(motivo: Omit<IMotivoRefugo, 'status'> & { status?: string }): Promise<IMotivoRefugo> {
    const data = await motivosRefugoApi.criar({
      codigo: motivo.codigo,
      descricao: motivo.descricao,
      tipo: motivo.tipo,
      status: motivo.status ?? 'Ativo',
    });
    return data;
  },

  async updateMotivoRefugo(codigo: string, motivo: Partial<IMotivoRefugo>): Promise<IMotivoRefugo> {
    const data = await motivosRefugoApi.atualizar(codigo, {
      descricao: motivo.descricao,
      tipo: motivo.tipo,
      status: motivo.status,
    });
    return data;
  },

  async deleteMotivoRefugo(codigo: string): Promise<void> {
    await motivosRefugoApi.excluir(codigo);
  },

  // ========== DEFEITOS DE REFUGO ==========
  async getDefeitosRefugo(): Promise<IDefeitoRefugo[]> {
    const data = await defeitosRefugoApi.listar();
    return data;
  },

  async getDefeitoRefugoByCodigo(codigo: string): Promise<IDefeitoRefugo | null> {
    try {
      const data = await defeitosRefugoApi.buscarPorId(codigo);
      return data;
    } catch {
      return null;
    }
  },

  async createDefeitoRefugo(defeito: Omit<IDefeitoRefugo, 'status'> & { status?: string }): Promise<IDefeitoRefugo> {
    const data = await defeitosRefugoApi.criar({
      codigo: defeito.codigo,
      descricao: defeito.descricao,
      setores_precos: defeito.setores_precos,
      custo_base: defeito.custo_base ?? 0.00,
      status: defeito.status ?? 'Ativo',
    });
    return data;
  },

  async updateDefeitoRefugo(codigo: string, defeito: Partial<IDefeitoRefugo>): Promise<IDefeitoRefugo> {
    const data = await defeitosRefugoApi.atualizar(codigo, {
      descricao: defeito.descricao,
      setores_precos: defeito.setores_precos,
      custo_base: defeito.custo_base,
      status: defeito.status,
    });
    return data;
  },

  async deleteDefeitoRefugo(codigo: string): Promise<void> {
    await defeitosRefugoApi.excluir(codigo);
  },
};

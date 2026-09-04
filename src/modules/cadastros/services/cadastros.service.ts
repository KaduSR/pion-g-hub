// Cadastros Service - Modulo de Cadastros Gerais
// Referencia: docs/piong-blueprint/03-mapa-funcional.md
// Interfaces: src/shared/types/cadastros.ts

import { supabase } from '../../shared/lib/supabase';
import type { IArea, IDepartamento, ISetor, ICargo, IMotivoRefugo, IDefeitoRefugo } from '../../shared/types/cadastros';

export interface CadastrosFilters {
  busca?: string;
  status?: boolean;
}

export const cadastrosService = {
  // ========== ÁREAS ==========
  async getAreas(filters?: CadastrosFilters): Promise<IArea[]> {
    let query = supabase.from('areas').select('*');

    if (filters?.status !== undefined) {
      query = query.eq('status', filters.status ? '1' : '0');
    }
    if (filters?.busca) {
      query = query.ilike('descricao', `%${filters.busca}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as IArea[]) ?? [];
  },

  async getAreaById(id: string): Promise<IArea | null> {
    const { data, error } = await supabase.from('areas').select('*').eq('id', id).single();
    if (error) throw error;
    return data as IArea;
  },

  async createArea(area: Omit<IArea, 'id'>): Promise<IArea> {
    const { data, error } = await supabase.from('areas').insert(area).select().single();
    if (error) throw error;
    return data as IArea;
  },

  async updateArea(id: string, area: Partial<IArea>): Promise<IArea> {
    const { data, error } = await supabase.from('areas').update(area).eq('id', id).select().single();
    if (error) throw error;
    return data as IArea;
  },

  async deleteArea(id: string): Promise<void> {
    const { error } = await supabase.from('areas').delete().eq('id', id);
    if (error) throw error;
  },

  // ========== DEPARTAMENTOS ==========
  async getDepartamentos(filters?: CadastrosFilters): Promise<IDepartamento[]> {
    let query = supabase.from('departamentos').select('*');

    if (filters?.status !== undefined) {
      query = query.eq('status', filters.status ? '1' : '0');
    }
    if (filters?.busca) {
      query = query.ilike('descricao', `%${filters.busca}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as IDepartamento[]) ?? [];
  },

  async getDepartamentoById(id: string): Promise<IDepartamento | null> {
    const { data, error } = await supabase.from('departamentos').select('*').eq('id', id).single();
    if (error) throw error;
    return data as IDepartamento;
  },

  async createDepartamento(departamento: Omit<IDepartamento, 'id'>): Promise<IDepartamento> {
    const { data, error } = await supabase.from('departamentos').insert(departamento).select().single();
    if (error) throw error;
    return data as IDepartamento;
  },

  async updateDepartamento(id: string, departamento: Partial<IDepartamento>): Promise<IDepartamento> {
    const { data, error } = await supabase.from('departamentos').update(departamento).eq('id', id).select().single();
    if (error) throw error;
    return data as IDepartamento;
  },

  async deleteDepartamento(id: string): Promise<void> {
    const { error } = await supabase.from('departamentos').delete().eq('id', id);
    if (error) throw error;
  },

  // ========== SETORES ==========
  async getSetores(filters?: CadastrosFilters): Promise<ISetor[]> {
    let query = supabase.from('setores').select('*');

    if (filters?.status !== undefined) {
      query = query.eq('status', filters.status ? '1' : '0');
    }
    if (filters?.busca) {
      query = query.ilike('descricao', `%${filters.busca}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as ISetor[]) ?? [];
  },

  async getSetorById(id: string): Promise<ISetor | null> {
    const { data, error } = await supabase.from('setores').select('*').eq('id', id).single();
    if (error) throw error;
    return data as ISetor;
  },

  async createSetor(setor: Omit<ISetor, 'id'>): Promise<ISetor> {
    const { data, error } = await supabase.from('setores').insert(setor).select().single();
    if (error) throw error;
    return data as ISetor;
  },

  async updateSetor(id: string, setor: Partial<ISetor>): Promise<ISetor> {
    const { data, error } = await supabase.from('setores').update(setor).eq('id', id).select().single();
    if (error) throw error;
    return data as ISetor;
  },

  async deleteSetor(id: string): Promise<void> {
    const { error } = await supabase.from('setores').delete().eq('id', id);
    if (error) throw error;
  },

  // ========== CARGOS ==========
  async getCargos(filters?: CadastrosFilters): Promise<ICargo[]> {
    let query = supabase.from('cargos').select('*');

    if (filters?.status !== undefined) {
      query = query.eq('status', filters.status ? '1' : '0');
    }
    if (filters?.busca) {
      query = query.ilike('descricao', `%${filters.busca}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as ICargo[]) ?? [];
  },

  async getCargoById(id: string): Promise<ICargo | null> {
    const { data, error } = await supabase.from('cargos').select('*').eq('id', id).single();
    if (error) throw error;
    return data as ICargo;
  },

  async createCargo(cargo: Omit<ICargo, 'id'>): Promise<ICargo> {
    const { data, error } = await supabase.from('cargos').insert(cargo).select().single();
    if (error) throw error;
    return data as ICargo;
  },

  async updateCargo(id: string, cargo: Partial<ICargo>): Promise<ICargo> {
    const { data, error } = await supabase.from('cargos').update(cargo).eq('id', id).select().single();
    if (error) throw error;
    return data as ICargo;
  },

  async deleteCargo(id: string): Promise<void> {
    const { error } = await supabase.from('cargos').delete().eq('id', id);
    if (error) throw error;
  },

  // ========== MOTIVOS REBUGO ==========
  async getMotivosRefugo(filters?: CadastrosFilters): Promise<IMotivoRefugo[]> {
    let query = supabase.from('motivos_refugo').select('*');

    if (filters?.status !== undefined) {
      query = query.eq('status', filters.status ? '1' : '0');
    }
    if (filters?.busca) {
      query = query.ilike('descricao', `%${filters.busca}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as IMotivoRefugo[]) ?? [];
  },

  async getMotivoRefugoById(id: string): Promise<IMotivoRefugo | null> {
    const { data, error } = await supabase.from('motivos_refugo').select('*').eq('id', id).single();
    if (error) throw error;
    return data as IMotivoRefugo;
  },

  async createMotivoRefugo(motivo: Omit<IMotivoRefugo, 'id'>): Promise<IMotivoRefugo> {
    const { data, error } = await supabase.from('motivos_refugo').insert(motivo).select().single();
    if (error) throw error;
    return data as IMotivoRefugo;
  },

  async updateMotivoRefugo(id: string, motivo: Partial<IMotivoRefugo>): Promise<IMotivoRefugo> {
    const { data, error } = await supabase.from('motivos_refugo').update(motivo).eq('id', id).select().single();
    if (error) throw error;
    return data as IMotivoRefugo;
  },

  async deleteMotivoRefugo(id: string): Promise<void> {
    const { error } = await supabase.from('motivos_refugo').delete().eq('id', id);
    if (error) throw error;
  },

  // ========== DEFEITOS REBUGO ==========
  async getDefeitosRefugo(filters?: CadastrosFilters): Promise<IDefeitoRefugo[]> {
    let query = supabase.from('defeitos_refugo').select('*');

    if (filters?.status !== undefined) {
      query = query.eq('status', filters.status ? '1' : '0');
    }
    if (filters?.busca) {
      query = query.ilike('descricao', `%${filters.busca}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as IDefeitoRefugo[]) ?? [];
  },

  async getDefeitoRefugoById(id: string): Promise<IDefeitoRefugo | null> {
    const { data, error } = await supabase.from('defeitos_refugo').select('*').eq('id', id).single();
    if (error) throw error;
    return data as IDefeitoRefugo;
  },

  async createDefeitoRefugo(defeito: Omit<IDefeitoRefugo, 'id'>): Promise<IDefeitoRefugo> {
    const { data, error } = await supabase.from('defeitos_refugo').insert(defeito).select().single();
    if (error) throw error;
    return data as IDefeitoRefugo;
  },

  async updateDefeitoRefugo(id: string, defeito: Partial<IDefeitoRefugo>): Promise<IDefeitoRefugo> {
    const { data, error } = await supabase.from('defeitos_refugo').update(defeito).eq('id', id).select().single();
    if (error) throw error;
    return data as IDefeitoRefugo;
  },

  async deleteDefeitoRefugo(id: string): Promise<void> {
    const { error } = await supabase.from('defeitos_refugo').delete().eq('id', id);
    if (error) throw error;
  },
};

export default cadastrosService;
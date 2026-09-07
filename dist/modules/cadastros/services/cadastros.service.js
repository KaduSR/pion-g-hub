"use strict";
// Cadastros Service - Modulo de Cadastros Gerais
// Referencia: docs/piong-blueprint/03-mapa-funcional.md
// Interfaces: src/shared/types/cadastros.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.cadastrosService = void 0;
const supabase_1 = require("../../../shared/lib/supabase");
exports.cadastrosService = {
    // ========== ÁREAS ==========
    async getAreas(filters) {
        let query = supabase_1.supabase.from('areas').select('*');
        if (filters?.status !== undefined) {
            query = query.eq('status', filters.status ? '1' : '0');
        }
        if (filters?.busca) {
            query = query.ilike('descricao', `%${filters.busca}%`);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data ?? [];
    },
    async getAreaById(id) {
        const { data, error } = await supabase_1.supabase.from('areas').select('*').eq('id', id).single();
        if (error)
            throw error;
        return data;
    },
    async createArea(area) {
        const { data, error } = await supabase_1.supabase.from('areas').insert(area).select().single();
        if (error)
            throw error;
        return data;
    },
    async updateArea(id, area) {
        const { data, error } = await supabase_1.supabase.from('areas').update(area).eq('id', id).select().single();
        if (error)
            throw error;
        return data;
    },
    async deleteArea(id) {
        const { error } = await supabase_1.supabase.from('areas').delete().eq('id', id);
        if (error)
            throw error;
    },
    // ========== DEPARTAMENTOS ==========
    async getDepartamentos(filters) {
        let query = supabase_1.supabase.from('departamentos').select('*');
        if (filters?.status !== undefined) {
            query = query.eq('status', filters.status ? '1' : '0');
        }
        if (filters?.busca) {
            query = query.ilike('descricao', `%${filters.busca}%`);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data ?? [];
    },
    async getDepartamentoById(id) {
        const { data, error } = await supabase_1.supabase.from('departamentos').select('*').eq('id', id).single();
        if (error)
            throw error;
        return data;
    },
    async createDepartamento(departamento) {
        const { data, error } = await supabase_1.supabase.from('departamentos').insert(departamento).select().single();
        if (error)
            throw error;
        return data;
    },
    async updateDepartamento(id, departamento) {
        const { data, error } = await supabase_1.supabase.from('departamentos').update(departamento).eq('id', id).select().single();
        if (error)
            throw error;
        return data;
    },
    async deleteDepartamento(id) {
        const { error } = await supabase_1.supabase.from('departamentos').delete().eq('id', id);
        if (error)
            throw error;
    },
    // ========== SETORES ==========
    async getSetores(filters) {
        let query = supabase_1.supabase.from('setores').select('*');
        if (filters?.status !== undefined) {
            query = query.eq('status', filters.status ? '1' : '0');
        }
        if (filters?.busca) {
            query = query.ilike('descricao', `%${filters.busca}%`);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data ?? [];
    },
    async getSetorById(id) {
        const { data, error } = await supabase_1.supabase.from('setores').select('*').eq('id', id).single();
        if (error)
            throw error;
        return data;
    },
    async createSetor(setor) {
        const { data, error } = await supabase_1.supabase.from('setores').insert(setor).select().single();
        if (error)
            throw error;
        return data;
    },
    async updateSetor(id, setor) {
        const { data, error } = await supabase_1.supabase.from('setores').update(setor).eq('id', id).select().single();
        if (error)
            throw error;
        return data;
    },
    async deleteSetor(id) {
        const { error } = await supabase_1.supabase.from('setores').delete().eq('id', id);
        if (error)
            throw error;
    },
    // ========== CARGOS ==========
    async getCargos(filters) {
        let query = supabase_1.supabase.from('cargos').select('*');
        if (filters?.status !== undefined) {
            query = query.eq('status', filters.status ? '1' : '0');
        }
        if (filters?.busca) {
            query = query.ilike('descricao', `%${filters.busca}%`);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data ?? [];
    },
    async getCargoById(id) {
        const { data, error } = await supabase_1.supabase.from('cargos').select('*').eq('id', id).single();
        if (error)
            throw error;
        return data;
    },
    async createCargo(cargo) {
        const { data, error } = await supabase_1.supabase.from('cargos').insert(cargo).select().single();
        if (error)
            throw error;
        return data;
    },
    async updateCargo(id, cargo) {
        const { data, error } = await supabase_1.supabase.from('cargos').update(cargo).eq('id', id).select().single();
        if (error)
            throw error;
        return data;
    },
    async deleteCargo(id) {
        const { error } = await supabase_1.supabase.from('cargos').delete().eq('id', id);
        if (error)
            throw error;
    },
    // ========== MOTIVOS REBUGO ==========
    async getMotivosRefugo(filters) {
        let query = supabase_1.supabase.from('motivos_refugo').select('*');
        if (filters?.status !== undefined) {
            query = query.eq('status', filters.status ? '1' : '0');
        }
        if (filters?.busca) {
            query = query.ilike('descricao', `%${filters.busca}%`);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data ?? [];
    },
    async getMotivoRefugoById(id) {
        const { data, error } = await supabase_1.supabase.from('motivos_refugo').select('*').eq('id', id).single();
        if (error)
            throw error;
        return data;
    },
    async createMotivoRefugo(motivo) {
        const { data, error } = await supabase_1.supabase.from('motivos_refugo').insert(motivo).select().single();
        if (error)
            throw error;
        return data;
    },
    async updateMotivoRefugo(id, motivo) {
        const { data, error } = await supabase_1.supabase.from('motivos_refugo').update(motivo).eq('id', id).select().single();
        if (error)
            throw error;
        return data;
    },
    async deleteMotivoRefugo(id) {
        const { error } = await supabase_1.supabase.from('motivos_refugo').delete().eq('id', id);
        if (error)
            throw error;
    },
    // ========== DEFEITOS REBUGO ==========
    async getDefeitosRefugo(filters) {
        let query = supabase_1.supabase.from('defeitos_refugo').select('*');
        if (filters?.status !== undefined) {
            query = query.eq('status', filters.status ? '1' : '0');
        }
        if (filters?.busca) {
            query = query.ilike('descricao', `%${filters.busca}%`);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data ?? [];
    },
    async getDefeitoRefugoById(id) {
        const { data, error } = await supabase_1.supabase.from('defeitos_refugo').select('*').eq('id', id).single();
        if (error)
            throw error;
        return data;
    },
    async createDefeitoRefugo(defeito) {
        const { data, error } = await supabase_1.supabase.from('defeitos_refugo').insert(defeito).select().single();
        if (error)
            throw error;
        return data;
    },
    async updateDefeitoRefugo(id, defeito) {
        const { data, error } = await supabase_1.supabase.from('defeitos_refugo').update(defeito).eq('id', id).select().single();
        if (error)
            throw error;
        return data;
    },
    async deleteDefeitoRefugo(id) {
        const { error } = await supabase_1.supabase.from('defeitos_refugo').delete().eq('id', id);
        if (error)
            throw error;
    },
};
exports.default = exports.cadastrosService;
//# sourceMappingURL=cadastros.service.js.map
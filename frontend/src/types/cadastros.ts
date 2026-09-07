// Cadastros Types - Baseado no RELATORIO_MAPEAMENTO_COMPLETO.md (secoes 9.1 a 9.6)
export interface IArea {
  id: string;
  descricao: string;
  descricao_curta: string;
  status: string;
}

export interface IDepartamento {
  id: string;
  descricao: string;
  descricao_curta: string;
  status: string;
}

export interface ISetor {
  id: string;
  descricao: string;
  descricao_curta: string;
  status: string;
}

export interface ICargo {
  id: string;
  descricao: string;
  descricao_curta: string;
  status: string;
}

export interface IMotivoRefugo {
  codigo: string;
  descricao: string;
  tipo: string;
  status: string;
}

export interface IDefeitoRefugo {
  codigo: string;
  descricao: string;
  setores_precos: string;
  custo_base: number;
  status: string;
}

// ============================================
// RH — Colaboradores (Fase 2)
// ============================================
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

export interface IEscala {
  id: string;
  colaborador_id: string;
  data_escala: string;
  turno: string;
  status: string;
  colaborador_nome?: string;
  created_at?: Date;
  updated_at?: Date;
}

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
  created_at?: Date;
  updated_at?: Date;
}

export interface IOperacaoLogistica {
  id: string;
  codigo_rastreio: string;
  colaborador_responsavel_id?: string;
  colaborador_nome?: string;
  origem: string;
  destino: string;
  status_operacao: string;
  data_prevista?: string;
  created_at?: string;
}

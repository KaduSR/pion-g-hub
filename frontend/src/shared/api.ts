import type { IDashboardMetrics } from '../types/cadastros';
// Integracao real com API Express via HTTP
// Endpoints: /api/v1/areas, /api/v1/departamentos, /api/v1/setores, /api/v1/cargos, /api/v1/motivos-refugo, /api/v1/defeitos-refugo
// Autenticacao: JWT injetado automaticamente pelo cliente api.ts

const BASE_URL = '/api/v1';

// Get JWT token from localStorage
function getToken(): string | null {
  return localStorage.getItem('piong_token');
}

// Create HTTP client with JWT interception
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const token = getToken();

  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: authHeaders,
    credentials: 'same-origin',
  });

  const contentType = response.headers.get('content-type');
  let data;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'error' in data
      ? (data as { error?: string }).error || `HTTP error! status: ${response.status}`
      : `HTTP error! status: ${response.status}`;

    const error = new Error(message) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  return data as T;
}

// API methods for Areas
export const areasApi = {
  async listar() {
    return fetchApi<any[]>('/areas');
  },

  async buscarPorId(id: string) {
    return fetchApi<any>(`/areas/${id}`);
  },

  async criar(data: { descricao: string; descricao_curta: string; status?: string }) {
    return fetchApi<any>('/areas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async atualizar(id: string, data: Partial<{ descricao: string; descricao_curta: string; status?: string }>) {
    return fetchApi<any>(`/areas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async excluir(id: string) {
    return fetchApi<void>(`/areas/${id}`, {
      method: 'DELETE',
    });
  },
};

// API methods for Departamentos
export const departamentosApi = {
  async listar() {
    return fetchApi<any[]>('/departamentos');
  },

  async buscarPorId(id: string) {
    return fetchApi<any>(`/departamentos/${id}`);
  },

  async criar(data: { descricao: string; descricao_curta: string; status?: string }) {
    return fetchApi<any>('/departamentos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async atualizar(id: string, data: Partial<{ descricao: string; descricao_curta: string; status?: string }>) {
    return fetchApi<any>(`/departamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async excluir(id: string) {
    return fetchApi<void>(`/departamentos/${id}`, {
      method: 'DELETE',
    });
  },
};

// API methods for Setores
export const setoresApi = {
  async listar() {
    return fetchApi<any[]>('/setores');
  },

  async buscarPorId(id: string) {
    return fetchApi<any>(`/setores/${id}`);
  },

  async criar(data: { descricao: string; descricao_curta: string; status?: string }) {
    return fetchApi<any>('/setores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async atualizar(id: string, data: Partial<{ descricao: string; descricao_curta: string; status?: string }>) {
    return fetchApi<any>(`/setores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async excluir(id: string) {
    return fetchApi<void>(`/setores/${id}`, {
      method: 'DELETE',
    });
  },
};

// API methods for Cargos
export const cargosApi = {
  async listar() {
    return fetchApi<any[]>('/cargos');
  },

  async buscarPorId(id: string) {
    return fetchApi<any>(`/cargos/${id}`);
  },

  async criar(data: { descricao: string; descricao_curta: string; status?: string }) {
    return fetchApi<any>('/cargos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async atualizar(id: string, data: Partial<{ descricao: string; descricao_curta: string; status?: string }>) {
    return fetchApi<any>(`/cargos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async excluir(id: string) {
    return fetchApi<void>(`/cargos/${id}`, {
      method: 'DELETE',
    });
  },
};

// API methods for Motivos de Refugo
export const motivosRefugoApi = {
  async listar() {
    return fetchApi<any[]>('/motivos-refugo');
  },

  async buscarPorId(codigo: string) {
    return fetchApi<any>(`/motivos-refugo/${codigo}`);
  },

  async criar(data: { codigo: string; descricao: string; tipo: string; status?: string }) {
    return fetchApi<any>('/motivos-refugo', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async atualizar(codigo: string, data: Partial<{ descricao: string; tipo: string; status?: string }>) {
    return fetchApi<any>(`/motivos-refugo/${codigo}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async excluir(codigo: string) {
    return fetchApi<void>(`/motivos-refugo/${codigo}`, {
      method: 'DELETE',
    });
  },
};

// API methods for Pontos (RH - Fase 2 - Controle de Ponto)
export const pontosApi = {
  async listar() { return fetchApi<any[]>('/pontos'); },
  async buscarPorId(id: string) { return fetchApi<any>(`/pontos/${id}`); },
  async criar(data: { colaborador_id: string; data_registro: string; hora_entrada?: string; hora_saida?: string; tipo_registro?: string; observacao?: string }) {
    return fetchApi<any>('/pontos', { method: 'POST', body: JSON.stringify(data) });
  },
  async atualizar(id: string, data: Partial<{ colaborador_id?: string; data_registro?: string; hora_entrada?: string; hora_saida?: string; tipo_registro?: string; observacao?: string }>) {
    return fetchApi<any>(`/pontos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async excluir(id: string) { return fetchApi<void>(`/pontos/${id}`, { method: 'DELETE' }); },
};

// API methods for Escalas (RH - Fase 2 - Escala do Mes)
export const escalasApi = {
  async listar() {
    return fetchApi<any[]>('/escalas');
  },
  async buscarPorId(id: string) {
    return fetchApi<any>(`/escalas/${id}`);
  },
  async criar(data: { colaborador_id: string; data_escala: string; turno: string; status?: string }) {
    return fetchApi<any>('/escalas', { method: 'POST', body: JSON.stringify(data) });
  },
  async atualizar(id: string, data: Partial<{ colaborador_id?: string; data_escala?: string; turno?: string; status?: string }>) {
    return fetchApi<any>(`/escalas/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async excluir(id: string) {
    return fetchApi<void>(`/escalas/${id}`, { method: 'DELETE' });
  },
};

// API methods for Colaboradores (RH - Fase 2)
export const colaboradoresApi = {
  async listar() {
    return fetchApi<any[]>('/colaboradores');
  },

  async buscarPorId(id: string) {
    return fetchApi<any>(`/colaboradores/${id}`);
  },

  async criar(data: {
    nome: string; matricula: string; cpf: string;
    cargo_id: string; departamento_id: string; status?: string
  }) {
    return fetchApi<any>('/colaboradores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async atualizar(id: string, data: Partial<{
    nome?: string; matricula?: string; cpf?: string;
    cargo_id?: string; departamento_id?: string; status?: string
  }>) {
    return fetchApi<any>(`/colaboradores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async excluir(id: string) {
    return fetchApi<void>(`/colaboradores/${id}`, {
      method: 'DELETE',
    });
  },
};

// API methods for Defeitos de Refugo
export const defeitosRefugoApi = {
  async listar() {
    return fetchApi<any[]>('/defeitos-refugo');
  },

  async buscarPorId(codigo: string) {
    return fetchApi<any>(`/defeitos-refugo/${codigo}`);
  },

  async criar(data: { codigo: string; descricao: string; setores_precos?: string; custo_base?: number; status?: string }) {
    return fetchApi<any>('/defeitos-refugo', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async atualizar(codigo: string, data: Partial<{ descricao: string; setores_precos?: string; custo_base?: number; status?: string }>) {
    return fetchApi<any>(`/defeitos-refugo/${codigo}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async excluir(codigo: string) {
    return fetchApi<void>(`/defeitos-refugo/${codigo}`, {
      method: 'DELETE',
    });
  },
};

// Logistica (Dia 4 - Módulo Logística / Operações)
export const logisticaApi = {
  async listar() { return fetchApi<any[]>('/logistica'); },
  async buscarPorId(id: string) { return fetchApi<any>(`/logistica/${id}`); },
  async criar(data: { codigo_rastreio: string; colaborador_responsavel_id?: string; origem: string; destino: string; status_operacao?: string; data_prevista?: string }) {
    return fetchApi<any>('/logistica', { method: 'POST', body: JSON.stringify(data) });
  },
  async atualizar(id: string, data: Partial<{ codigo_rastreio?: string; colaborador_responsavel_id?: string; origem?: string; destino?: string; status_operacao?: string; data_prevista?: string }>) {
    return fetchApi<any>(`/logistica/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async excluir(id: string) { return fetchApi<void>(`/logistica/${id}`, { method: 'DELETE' }); },
};

export const dashboardApi = {
  async getMetrics() { return fetchApi<IDashboardMetrics>('/dashboard/metrics'); },
};

// Auditoria (Hora 4 - Governança & Auditoria UI)
// API para listagem de logs de auditoria - restrita a administradores
export const auditoriaApi = {
  async listar() {
    return fetchApi<{ success: boolean; data: any[] }>('/auditoria');
  },
};

// Relatorios (Dia 5 - Central de Relatorios e Exportacao)
async function fetchCsvBlob(endpoint: string): Promise<Blob> {
  const url = `${BASE_URL}${endpoint}`;
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = typeof data === 'object' && data !== null && 'error' in data
      ? (data as { error?: string }).error || `HTTP error! status: ${response.status}`
      : `HTTP error! status: ${response.status}`;

    const error = new Error(message) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error('Arquivo vazio recebido do servidor.');
  }

  return blob;
}

export const relatoriosApi = {
  async baixarColaboradoresCSV(): Promise<Blob> {
    return fetchCsvBlob('/relatorios/colaboradores-csv');
  },

  async baixarLogisticaCSV(): Promise<Blob> {
    return fetchCsvBlob('/relatorios/logistica-csv');
  },
};

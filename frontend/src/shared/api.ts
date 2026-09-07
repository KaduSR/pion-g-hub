// Integracao real com API Express via HTTP
// Endpoints: /api/v1/areas e /api/v1/departamentos
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

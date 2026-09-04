// PionG Blueprint: Type Definitions

// ============================================
// Perfis
// ============================================
export interface Perfil {
  id: string;
  nome: string;
  descricao: string | null;
  nivel_hierarquico: number;
  status: boolean;
  created_at: Date;
  updated_at: Date;
  colaboradores_count?: number;
}

export interface PerfilCreate {
  nome: string;
  descricao?: string;
  nivel_hierarquico: number;
  status?: boolean;
}

export interface PerfilUpdate {
  nome?: string;
  descricao?: string;
  nivel_hierarquico?: number;
  status?: boolean;
}

// ============================================
// Permissoes
// ============================================
export interface Permissao {
  id: string;
  perfil_id: string;
  modulo_id: string;
  acao_codigo: string;
  permitido: boolean;
  created_at: Date;
}

export interface PermissaoUpdate {
  modulo_id: string;
  acao_codigo: string;
  permitido: boolean;
}

export interface PermissaoBulkUpdate {
  permissoes: PermissaoUpdate[];
}

// ============================================
// Modulos
// ============================================
export interface Modulo {
  id: string;
  codigo: string;
  nome: string;
  departamento: string;
  descricao: string | null;
  created_at: Date;
}

export type Acao = 'list' | 'read' | 'create' | 'update' | 'delete' | 'export' | 'toggle' | 'validate' | 'force';

// ============================================
// Sessoes (Usuarios Online)
// ============================================
export interface Sessao {
  id: string;
  usuario_id: string;
  usuario_email?: string;
  usuario_nome?: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  navegador: string | null;
  sistema_operacional: string | null;
  device_type: 'desktop' | 'tablet' | 'mobile' | 'unknown' | null;
  ip_geolocalizacao: IpGeolocalizacao | null;
  started_at: Date;
  last_activity_at: Date;
  expires_at: Date;
  status: 'ativa' | 'inativa' | 'expirada' | 'forcada';
  forcada_por: string | null;
  forcada_em: Date | null;
  created_at: Date;
  tempo_online?: string; // Calculado em runtime
}

export interface SessaoDetalhe extends Sessao {
  historico: SessaoHistorico[];
}

export interface IpGeolocalizacao {
  pais: string | null;
  estado: string | null;
  cidade: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface SessaoHistorico {
  id: string;
  sessao_id: string;
  acao: string | null;
  modulo: string | null;
  detalhes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: Date;
}

// ============================================
// Filtros
// ============================================
export interface PerfilFilters {
  status?: boolean | null;
  nivel_min?: number;
  nivel_max?: number;
  modulo_permissao?: string;
  busca?: string;
}

export interface SessaoFilters {
  status?: 'ativa' | 'inativa' | 'expirada' | 'forcada' | null;
  filial_id?: string;
  usuario_id?: string;
  data_inicio?: Date;
  data_fim?: Date;
}

// ============================================
// API Response
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// Auth
// ============================================
export interface AuthUser {
  id: string;
  email: string;
  colaborador_id: string | null;
  perfil_id: string;
  nivel_hierarquico: number;
  filial_id: string | null;
}

export interface JwtPayload {
  sub: string;
  email: string;
  perfil_id: string;
  nivel_hierarquico: number;
  filial_id: string | null;
  iat: number;
  exp: number;
}
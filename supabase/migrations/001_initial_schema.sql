-- PionG Blueprint: Migration 001 - Schema Inicial
-- Modulos: Perfis, Permissoes, Sessoes, Colaboradores, Filiais, Feriados

-- ============================================
-- Tabela: perfis
-- ============================================
CREATE TABLE IF NOT EXISTS perfis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    nivel_hierarquico INTEGER NOT NULL DEFAULT 50 CHECK (nivel_hierarquico >= 0 AND nivel_hierarquico <= 100),
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_perfis_status ON perfis(status);
CREATE INDEX idx_perfis_nivel ON perfis(nivel_hierarquico);

-- ============================================
-- Tabela: modulos (catalogo de modulos do sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS modulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    departamento VARCHAR(50) NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Tabela: acoes (catalogo de acoes por modulo)
-- ============================================
CREATE TABLE IF NOT EXISTS acoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL,
    modulo_id UUID NOT NULL REFERENCES modulos(id),
    nome VARCHAR(100) NOT NULL,
    UNIQUE(codigo, modulo_id)
);

-- ============================================
-- Tabela: permissoes
-- ============================================
CREATE TABLE IF NOT EXISTS permissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_id UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
    modulo_id UUID NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
    acao_codigo VARCHAR(50) NOT NULL,
    permitido BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(perfil_id, modulo_id, acao_codigo)
);

CREATE INDEX idx_permissoes_perfil ON permissoes(perfil_id);
CREATE INDEX idx_permissoes_modulo ON permissoes(modulo_id);

-- ============================================
-- Tabela: filiais
-- ============================================
CREATE TABLE IF NOT EXISTS filiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nome VARCHAR(200) NOT NULL,
    cnpj VARCHAR(18),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    telefone VARCHAR(20),
    email VARCHAR(255),
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_filiais_status ON filiais(status);
CREATE INDEX idx_filiais_codigo ON filiais(codigo);

-- ============================================
-- Tabela: colaboradores
-- ============================================
CREATE TABLE IF NOT EXISTS colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula VARCHAR(50) UNIQUE,
    nome VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    cpf VARCHAR(14),
    data_nascimento DATE,
    telefone VARCHAR(20),
    cargo VARCHAR(100),
    departamento VARCHAR(100),
    filial_id UUID REFERENCES filiais(id),
    perfil_id UUID NOT NULL REFERENCES perfis(id) DEFAULT '00000000-0000-0000-0000-000000000003', -- Colaborador padrao
    status BOOLEAN NOT NULL DEFAULT true,
    data_admissao DATE,
    data_desligamento DATE,
    foto_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_colaboradores_email ON colaboradores(email);
CREATE INDEX idx_colaboradores_filial ON colaboradores(filial_id);
CREATE INDEX idx_colaboradores_perfil ON colaboradores(perfil_id);
CREATE INDEX idx_colaboradores_status ON colaboradores(status);

-- ============================================
-- Tabela: usuarios (autenticacao)
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    colaborador_id UUID REFERENCES colaboradores(id),
    perfil_id UUID NOT NULL REFERENCES perfis(id),
    status BOOLEAN NOT NULL DEFAULT true,
    ultimo_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_colaborador ON usuarios(colaborador_id);

-- ============================================
-- Tabela: sessoes (usuarios online)
-- ============================================
CREATE TABLE IF NOT EXISTS sessoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    navegador VARCHAR(100),
    sistema_operacional VARCHAR(100),
    device_type VARCHAR(20) CHECK (device_type IN ('desktop', 'tablet', 'mobile', 'unknown')),
    ip_geolocalizacao JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa', 'expirada', 'forcada')),
    forcada_por UUID REFERENCES usuarios(id),
    forcada_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessoes_usuario ON sessoes(usuario_id);
CREATE INDEX idx_sessoes_status ON sessoes(status);
CREATE INDEX idx_sessoes_expires ON sessoes(expires_at);
CREATE INDEX idx_sessoes_activity ON sessoes(last_activity_at);

-- ============================================
-- Tabela: sessoes_historico (log de acoes)
-- ============================================
CREATE TABLE IF NOT EXISTS sessoes_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id UUID NOT NULL REFERENCES sessoes(id) ON DELETE CASCADE,
    acao VARCHAR(100),
    modulo VARCHAR(50),
    detalhes JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessoes_historico_sessao ON sessoes_historico(sessao_id);
CREATE INDEX idx_sessoes_historico_data ON sessoes_historico(created_at);

-- ============================================
-- Tabela: feriados
-- ============================================
CREATE TABLE IF NOT EXISTS feriados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    data DATE NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('nacional', 'estadual', 'municipal', 'corporativo')),
    uf VARCHAR(2),
    municipio_codigo VARCHAR(10),
    ano INTEGER NOT NULL,
    repetitivo BOOLEAN DEFAULT false,
    filial_id UUID REFERENCES filiais(id), -- NULL = todas as filiais
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feriados_data ON feriados(data);
CREATE INDEX idx_feriados_tipo ON feriados(tipo);
CREATE INDEX idx_feriados_filial ON feriados(filial_id);
CREATE UNIQUE INDEX idx_feriados_unico ON feriados(data, tipo, uf, COALESCE(filial_id, '00000000-0000-0000-0000-000000000000'));

-- ============================================
-- Triggers para updated_at automatico
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_perfis_updated_at BEFORE UPDATE ON perfis FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_filiais_updated_at BEFORE UPDATE ON filiais FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_colaboradores_updated_at BEFORE UPDATE ON colaboradores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_feriados_updated_at BEFORE UPDATE ON feriados FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Dados Iniciais: Perfis Padrao
-- ============================================
INSERT INTO perfis (id, nome, descricao, nivel_hierarquico, status) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Administrador', 'Acesso total ao sistema', 100, true),
    ('00000000-0000-0000-0000-000000000002', 'Gestor', 'Acesso gerencial com restricoes', 80, true),
    ('00000000-0000-0000-0000-000000000003', 'Colaborador', 'Acesso basico', 50, true),
    ('00000000-0000-0000-0000-000000000004', 'Lider Producao', 'Controle de producao', 60, true),
    ('00000000-0000-0000-0000-000000000005', 'Equipe Manutencao', 'Gestao de OS', 40, true),
    ('00000000-0000-0000-0000-000000000006', 'Supervisor Manutencao', 'Supervisao de manutencao', 70, true),
    ('00000000-0000-0000-0000-000000000007', 'Lider RH', 'Gestao de RH', 75, true),
    ('00000000-0000-0000-0000-000000000008', 'Visualizador Producao', 'Apenas visualizacao', 30, true),
    ('00000000-0000-0000-0000-000000000009', 'Qualidad - Refugo', 'Controle de qualidade', 45, true),
    ('00000000-0000-0000-0000-000000000010', 'Somente Leitura', 'Leitura apenas', 20, true),
    ('00000000-0000-0000-0000-000000000011', 'Acesso Total', 'Acesso total (equivale a Admin)', 100, true),
    ('00000000-0000-0000-0000-000000000012', 'Ocultar Tudo', 'Nenhum acesso', 0, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Dados Iniciais: Modulos
-- ============================================
INSERT INTO modulos (id, codigo, nome, departamento) VALUES
    ('10000000-0000-0000-0000-000000000001', 'admin.dashboard', 'Dashboard', 'Administrativo'),
    ('10000000-0000-0000-0000-000000000002', 'admin.colaboradores', 'Colaboradores', 'Administrativo'),
    ('10000000-0000-0000-0000-000000000003', 'admin.permissoes', 'Permissoes', 'Administrativo'),
    ('10000000-0000-0000-0000-000000000004', 'admin.usuarios_online', 'Usuarios Online', 'Administrativo'),
    ('10000000-0000-0000-0000-000000000005', 'admin.filiais', 'Filiais', 'Administrativo'),
    ('10000000-0000-0000-0000-000000000006', 'admin.feriados', 'Feriados', 'Administrativo'),
    ('10000000-0000-0000-0000-000000000007', 'admin.controle_ponto', 'Controle de Ponto', 'Administrativo'),
    ('10000000-0000-0000-0000-000000000008', 'admin.escala_mes', 'Escala do Mes', 'Administrativo'),
    ('10000000-0000-0000-0000-000000000009', 'admin.validacao_ponto', 'Validacao de Ponto', 'Administrativo'),
    ('10000000-0000-0000-0000-000000000010', 'admin.quadro_avisos', 'Quadro de Avisos', 'Administrativo'),
    ('10000000-0000-0000-0000-000000000011', 'admin.os_manutencao', 'OS Manutencao', 'Administrativo'),
    ('20000000-0000-0000-0000-000000000001', 'logistica.dashboard', 'Dashboard', 'Logistica'),
    ('20000000-0000-0000-0000-000000000002', 'logistica.lancamentos', 'Lancamentos', 'Logistica'),
    ('20000000-0000-0000-0000-000000000003', 'logistica.transportadoras', 'Transportadoras', 'Logistica'),
    ('30000000-0000-0000-0000-000000000001', 'producao.dashboard', 'Dashboard', 'Producao'),
    ('30000000-0000-0000-0000-000000000002', 'producao.ordens', 'Ordens de Producao', 'Producao')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- Permissoes Padrao para Administrador
-- ============================================
INSERT INTO permissoes (perfil_id, modulo_id, acao_codigo, permitido)
SELECT '00000000-0000-0000-0000-000000000001', id, acao, true
FROM modulos
CROSS JOIN (VALUES ('list'), ('read'), ('create'), ('update'), ('delete'), ('export'), ('toggle'), ('validate'), ('force')) AS acoes(acao)
ON CONFLICT DO NOTHING;
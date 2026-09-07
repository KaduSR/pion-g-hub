-- PionG Hub: Migration 002 - Tabelas de Cadastros
-- Referencia: docs/piong-blueprint/03-mapa-funcional.md
-- Data: 2026-09-07

-- ============================================
-- AREAS
-- ============================================
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao VARCHAR(100) NOT NULL,
  descricao_curta VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_areas_descricao_curta ON areas(descricao_curta);

-- ============================================
-- DEPARTAMENTOS
-- ============================================
CREATE TABLE IF NOT EXISTS departamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao VARCHAR(100) NOT NULL,
  descricao_curta VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_departamentos_descricao_curta ON departamentos(descricao_curta);

-- ============================================
-- SETORES
-- ============================================
CREATE TABLE IF NOT EXISTS setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao VARCHAR(100) NOT NULL,
  descricao_curta VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_setores_descricao_curta ON setores(descricao_curta);

-- ============================================
-- CARGOS
-- ============================================
CREATE TABLE IF NOT EXISTS cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao VARCHAR(100) NOT NULL,
  descricao_curta VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cargos_descricao_curta ON cargos(descricao_curta);

-- ============================================
-- MOTIVOS DE REFUGO
-- ============================================
CREATE TABLE IF NOT EXISTS motivos_refugo (
  codigo VARCHAR(20) PRIMARY KEY,
  descricao VARCHAR(200) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_motivos_refugo_tipo ON motivos_refugo(tipo);
CREATE INDEX IF NOT EXISTS idx_motivos_refugo_status ON motivos_refugo(status);

-- ============================================
-- DEFEITOS DE REFUGO
-- ============================================
CREATE TABLE IF NOT EXISTS defeitos_refugo (
  codigo VARCHAR(20) PRIMARY KEY,
  descricao VARCHAR(200) NOT NULL,
  setores_precos TEXT,
  custo_base DECIMAL(10, 2) DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defeitos_refugo_status ON defeitos_refugo(status);

-- ============================================
-- DADOS INICIAIS - AREAS
-- ============================================
INSERT INTO areas (descricao, descricao_curta, status) VALUES
  ('Area de Producao', 'PROD', 'Ativo'),
  ('Area de Qualidade', 'QUAL', 'Ativo'),
  ('Area de Manutencao', 'MANUT', 'Ativo'),
  ('Area Administrativa', 'ADMIN', 'Ativo')
ON CONFLICT (descricao_curta) DO NOTHING;

-- ============================================
-- DADOS INICIAIS - DEPARTAMENTOS
-- ============================================
INSERT INTO departamentos (descricao, descricao_curta, status) VALUES
  ('Departamento de Producao', 'DP-PROD', 'Ativo'),
  ('Departamento de Qualidade', 'DP-QUAL', 'Ativo'),
  ('Departamento de Manutencao', 'DP-MANUT', 'Ativo'),
  ('Departamento Administrativo', 'DP-ADM', 'Ativo')
ON CONFLICT (descricao_curta) DO NOTHING;

-- ============================================
-- DADOS INICIAIS - SETORES
-- ============================================
INSERT INTO setores (descricao, descricao_curta, status) VALUES
  ('Setor de Montagem', 'MONT', 'Ativo'),
  ('Setor de Pintura', 'PINT', 'Ativo'),
  ('Setor de Inspecao', 'INSP', 'Ativo'),
  ('Setor de Embalagem', 'EMB', 'Ativo')
ON CONFLICT (descricao_curta) DO NOTHING;

-- ============================================
-- DADOS INICIAIS - CARGOS
-- ============================================
INSERT INTO cargos (descricao, descricao_curta, status) VALUES
  ('Operador de Producao', 'OP-PROD', 'Ativo'),
  ('Tecnico de Qualidade', 'TEC-QUAL', 'Ativo'),
  ('Tecnico de Manutencao', 'TEC-MANUT', 'Ativo'),
  ('Supervisor de Linha', 'SUP-LINHA', 'Ativo')
ON CONFLICT (descricao_curta) DO NOTHING;

-- ============================================
-- DADOS INICIAIS - MOTIVOS REFUGO
-- ============================================
INSERT INTO motivos_refugo (codigo, descricao, tipo, status) VALUES
  ('MR-001', 'Material com defeito', 'MATERIAL', 'Ativo'),
  ('MR-002', 'Erro de montagem', 'PROCESSO', 'Ativo'),
  ('MR-003', 'Acabamento inadequado', 'QUALIDADE', 'Ativo'),
  ('MR-004', 'Medida fora de spec', 'CONTROLE', 'Ativo')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- DADOS INICIAIS - DEFEITOS REFUGO
-- ============================================
INSERT INTO defeitos_refugo (codigo, descricao, setores_precos, custo_base, status) VALUES
  ('DF-001', 'Risco superficial', 'MONT,PINT', 5.50, 'Ativo'),
  ('DF-002', 'Deformacao dimensional', 'MONT', 12.00, 'Ativo'),
  ('DF-003', 'Bolha de ar', 'PINT', 8.25, 'Ativo'),
  ('DF-004', 'Cor descascando', 'PINT,INSP', 15.00, 'Ativo')
ON CONFLICT (codigo) DO NOTHING;

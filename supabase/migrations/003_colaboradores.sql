-- PionG Hub: Migration 003 - Colaboradores (RH)
-- Referencia: docs/piong-blueprint/03-mapa-funcional.md
-- Data: 2026-09-07

-- ============================================
-- COLABORADORES
-- ============================================
CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  matricula VARCHAR(20) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  cargo_id UUID NOT NULL,
  departamento_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chaves estrangeiras
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_colaboradores_cargo'
  ) THEN
    ALTER TABLE colaboradores
      ADD CONSTRAINT fk_colaboradores_cargo
      FOREIGN KEY (cargo_id) REFERENCES cargos (id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_colaboradores_departamento'
  ) THEN
    ALTER TABLE colaboradores
      ADD CONSTRAINT fk_colaboradores_departamento
      FOREIGN KEY (departamento_id) REFERENCES departamentos (id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Indices
CREATE UNIQUE INDEX IF NOT EXISTS idx_colaboradores_matricula ON colaboradores (matricula);
CREATE UNIQUE INDEX IF NOT EXISTS idx_colaboradores_cpf ON colaboradores (cpf);
CREATE INDEX IF NOT EXISTS idx_colaboradores_cargo ON colaboradores (cargo_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_departamento ON colaboradores (departamento_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_status ON colaboradores (status);

-- ============================================
-- DADOS INICIAIS
-- ============================================
INSERT INTO colaboradores (nome, matricula, cpf, cargo_id, departamento_id, status)
SELECT
  'Carlos Eduardo',
  'MAT-001',
  '000.000.000-00',
  c.id,
  d.id,
  'Ativo'
FROM cargos c
JOIN departamentos d ON d.descricao_curta = 'DP-ADM'
WHERE c.descricao_curta = 'SUP-LINHA'
ON CONFLICT (matricula) DO NOTHING;

INSERT INTO colaboradores (nome, matricula, cpf, cargo_id, departamento_id, status)
SELECT
  'Maria Silva',
  'MAT-002',
  '111.111.111-11',
  c.id,
  d.id,
  'Ativo'
FROM cargos c
JOIN departamentos d ON d.descricao_curta = 'DP-PROD'
WHERE c.descricao_curta = 'OP-PROD'
ON CONFLICT (matricula) DO NOTHING;

INSERT INTO colaboradores (nome, matricula, cpf, cargo_id, departamento_id, status)
SELECT
  'Joao Santos',
  'MAT-003',
  '222.222.222-22',
  c.id,
  d.id,
  'Ativo'
FROM cargos c
JOIN departamentos d ON d.descricao_curta = 'DP-QUAL'
WHERE c.descricao_curta = 'TEC-QUAL'
ON CONFLICT (matricula) DO NOTHING;
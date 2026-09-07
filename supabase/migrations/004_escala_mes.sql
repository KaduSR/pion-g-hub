-- PionG Hub: Migration 004 - Escala do Mes (RH)
-- Referencia: docs/piong-blueprint/03-mapa-funcional.md
-- Data: 2026-09-07

-- ============================================
-- ESCALA DO MES
-- ============================================
CREATE TABLE IF NOT EXISTS escala_mes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL,
  data_escala DATE NOT NULL,
  turno VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Previsto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_escala_colaborador'
  ) THEN
    ALTER TABLE escala_mes
      ADD CONSTRAINT fk_escala_colaborador
      FOREIGN KEY (colaborador_id) REFERENCES colaboradores (id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_escala_colaborador ON escala_mes (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_escala_data ON escala_mes (data_escala);
CREATE INDEX IF NOT EXISTS idx_escala_turno ON escala_mes (turno);
CREATE INDEX IF NOT EXISTS idx_escala_status ON escala_mes (status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_escala_unica ON escala_mes (colaborador_id, data_escala);
-- PionG Hub: Migration 005 - Controle de Ponto (RH)
-- Referencia: docs/piong-blueprint/03-mapa-funcional.md
-- Data: 2026-09-07

CREATE TABLE IF NOT EXISTS controle_ponto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL,
  data_registro DATE NOT NULL,
  hora_entrada TIME,
  hora_saida TIME,
  tipo_registro VARCHAR(20) NOT NULL DEFAULT 'Normal',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ponto_colaborador'
  ) THEN
    ALTER TABLE controle_ponto
      ADD CONSTRAINT fk_ponto_colaborador
      FOREIGN KEY (colaborador_id) REFERENCES colaboradores (id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ponto_colaborador ON controle_ponto (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_ponto_data ON controle_ponto (data_registro);
CREATE INDEX IF NOT EXISTS idx_ponto_tipo ON controle_ponto (tipo_registro);
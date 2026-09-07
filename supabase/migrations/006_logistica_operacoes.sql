-- Migration 006: Logística — Operações / Rotas de Cargas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS operacoes_logistica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_rastreio VARCHAR(50) UNIQUE NOT NULL,
  colaborador_responsavel_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  origem TEXT NOT NULL,
  destino TEXT NOT NULL,
  status_operacao VARCHAR(30) DEFAULT 'Pendente' CHECK (status_operacao IN ('Pendente','Em Trânsito','Entregue','Cancelado')),
  data_prevista DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logistica_rastreio ON operacoes_logistica(codigo_rastreio);
CREATE INDEX idx_logistica_colaborador ON operacoes_logistica(colaborador_responsavel_id);

-- Pion-G-Hub: Migration 009 — Índices de Performance
-- Foco: queries críticas de Dashboard, Relatórios e Logística
-- Referência: docs/performance-banco.md
-- Data: 2026-09-09

-- ============================================
-- Logística
-- ============================================
-- Query: Dashboard agrupa por status_operacao
-- Antes: sem índice específico (apenas rastreio e colaborador)
CREATE INDEX IF NOT EXISTS idx_logistica_status_operacao
  ON operacoes_logistica (status_operacao);

-- Query: Relatórios CSV ordena por created_at DESC
-- Antes: sem índice em created_at para logística
CREATE INDEX IF NOT EXISTS idx_logistica_created_at
  ON operacoes_logistica (created_at DESC);

-- ============================================
-- Escala do Mês
-- ============================================
-- Query: Dashboard filtra por mês corrente via EXTRACT(MONTH)
-- Solução: índice composto para filtro + ordenação comum
CREATE INDEX IF NOT EXISTS idx_escala_mes_mes_ano
  ON escala_mes (EXTRACT(MONTH FROM data_escala), EXTRACT(YEAR FROM data_escala));

-- ============================================
-- Controle de Ponto
-- ============================================
-- Query: Dashboard conta registros do dia corrente
-- Antes: apenas idx_ponto_data (igualdade por data)
-- Otimização: índice composto colaborador + data para filtros combinados
CREATE INDEX IF NOT EXISTS idx_ponto_colaborador_data
  ON controle_ponto (colaborador_id, data_registro DESC);

-- ============================================
-- Colaboradores
-- ============================================
-- Query: Relatórios CSV ordena por nome ASC e filtra por status
-- Antes: índices isolados; sem cobertura para ORDER BY + WHERE simultâneo
CREATE INDEX IF NOT EXISTS idx_colaboradores_status_nome
  ON colaboradores (status, nome);

-- ============================================
-- Auditoria
-- ============================================
-- Query: relatórios de auditoria por intervalo de data + tabela
-- Antes: apenas idx_auditoria_data DESC
-- Otimização: índice composto para filtros combinados
CREATE INDEX IF NOT EXISTS idx_auditoria_tabela_data
  ON auditoria_logs (tabela_afetada, criado_em DESC);

-- ============================================
-- Webhooks
-- ============================================
-- Query: busca por ativo + evento para dispatcher
-- Antes: apenas idx_webhooks_evento
CREATE INDEX IF NOT EXISTS idx_webhooks_evento_ativo
  ON webhooks_config (evento, ativo) WHERE ativo = TRUE;

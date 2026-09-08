-- Migration 008: Integração de Webhooks
-- Referencia: Fase 6 - Automação e Integrações

CREATE TABLE IF NOT EXISTS webhooks_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento TEXT NOT NULL,             -- Ex: logistica.criada, ponto.registrado
    url_destino TEXT NOT NULL,        -- URL do serviço externo/n8n
    ativo BOOLEAN DEFAULT TRUE,       -- Habilitado/Desabilitado
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index para busca rápida por evento
CREATE INDEX IF NOT EXISTS idx_webhooks_evento ON webhooks_config(evento);

COMMENT ON TABLE webhooks_config IS 'Configurações de webhooks para integração com serviços externos e automação n8n';

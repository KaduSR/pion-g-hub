-- Migration 007: Infraestrutura de Auditoria de Logs
-- Referencia: Governança e Auditoria de Sistema

CREATE TABLE IF NOT EXISTS auditoria_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID,
    ator_identificacao TEXT NOT NULL, -- Nome ou Email do usuário/sistema
    acao TEXT NOT NULL,              -- INSERT, UPDATE, DELETE, LOGIN, etc.
    tabela_afetada TEXT,             -- Nome da tabela (ex: colaboradores)
    registro_id TEXT,                -- ID do registro afetado
    detalhes JSONB,                  -- Payload do que foi alterado ou metadados
    ip_address TEXT,                 -- Origem da requisição
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index para busca rápida de logs por tabela e usuário
CREATE INDEX IF NOT EXISTS idx_auditoria_tabela ON auditoria_logs(tabela_afetada);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_data ON auditoria_logs(criado_em DESC);

COMMENT ON TABLE auditoria_logs IS 'Registros de auditoria para rastreabilidade de ações críticas no sistema PionG';

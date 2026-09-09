# Performance e Índices SQL — Pion-G-Hub

## Visão Geral
Este documento descreve as queries críticas do Pion-G-Hub, os gargalos identificados no PostgreSQL/Supabase e os índices criados na migration `009_indices_performance.sql`.

---

## 1. Queries Críticas Identificadas

### 1.1 Dashboard — Métricas Agregadas
**Arquivo**: `src/api/controllers/dashboard.controller.ts`

```sql
-- Métricas por status
SELECT status, COUNT(*) FROM colaboradores GROUP BY status;
SELECT status_operacao, COUNT(*) FROM operacoes_logistica GROUP BY status_operacao;

-- Contagem por data atual
SELECT COUNT(*) FROM controle_ponto WHERE data_registro = CURRENT_DATE;

-- Contagem por mês corrente
SELECT COUNT(*) FROM escala_mes
  WHERE EXTRACT(MONTH FROM data_escala) = EXTRACT(MONTH FROM CURRENT_DATE);
```

**Gargalo**: `EXTRACT(MONTH/YEAR FROM data_escala)` não utiliza índice tradicional. Solução: índice composto por `(EXTRACT(MONTH FROM data_escala), EXTRACT(YEAR FROM data_escala))`.

### 1.2 Relatórios — Exportação CSV
**Arquivo**: `src/api/controllers/relatorios.controller.ts`

```sql
-- Relatório Colaboradores (ordenado por nome)
SELECT c.nome, c.matricula, c.cpf, cr.descricao, d.descricao, c.status, ...
FROM colaboradores c
LEFT JOIN cargos cr ON c.cargo_id = cr.id
LEFT JOIN departamentos d ON c.departamento_id = d.id
ORDER BY c.nome;

-- Relatório Logística (ordenado por created_at DESC)
SELECT o.codigo_rastreio, c.nome, o.origem, o.destino, o.status_operacao, ...
FROM operacoes_logistica o
LEFT JOIN colaboradores c ON o.colaborador_responsavel_id = c.id
ORDER BY o.created_at DESC;
```

**Gargalo**: `ORDER BY` em tabelas grandes sem índice de cobertura. Solução: índices compostos que atendam `WHERE` + `ORDER BY` simultaneamente.

### 1.3 Logística — Listagem e Filtros
**Tabela**: `operacoes_logistica`

```sql
-- Busca por código de rastreio (já indexado)
SELECT * FROM operacoes_logistica WHERE codigo_rastreio = '...';

-- Filtro por status da operação (novo índice necessário)
SELECT * FROM operacoes_logistica WHERE status_operacao = 'Pendente';
```

---

## 2. Índices Criados na Migration 009

| Tabela | Índice | Colunas | Tipo | Motivo |
|---------|---------|---------|------|---------|
| `operacoes_logistica` | `idx_logistica_status_operacao` | `status_operacao` | Simples | GROUP BY dashboard |
| `operacoes_logistica` | `idx_logistica_created_at` | `created_at DESC` | Simples | ORDER BY relatórios |
| `escala_mes` | `idx_escala_mes_mes_ano` | `EXTRACT(MONTH/YEAR FROM data_escala)` | Expressão | Filtro dashboard |
| `controle_ponto` | `idx_ponto_colaborador_data` | `colaborador_id, data_registro DESC` | Composto | Filtros combinados RH |
| `colaboradores` | `idx_colaboradores_status_nome` | `status, nome` | Composto | WHERE + ORDER BY |
| `auditoria_logs` | `idx_auditoria_tabela_data` | `tabela_afetada, criado_em DESC` | Composto | Filtros de auditoria |
| `webhooks_config` | `idx_webhooks_evento_ativo` | `evento, ativo` | Parcial WHERE `ativo=TRUE` | Dispatcher webhooks |

---

## 3. Índices Existentes (Contexto)

### Colaboradores (`001_initial_schema.sql` + `003_colaboradores.sql`)
- `idx_colaboradores_email` — login/usuários
- `idx_colaboradores_matricula` — UNIQUE
- `idx_colaboradores_cpf` — UNIQUE
- `idx_colaboradores_status` — filtros ativos/inativos
- `idx_colaboradores_cargo` / `departamento` / `filial` / `perfil` — JOINs

### Logística (`006_logistica_operacoes.sql`)
- `idx_logistica_rastreio` — busca por código
- `idx_logistica_colaborador` — JOIN com colaboradores

### Controle de Ponto (`005_controle_ponto.sql`)
- `idx_ponto_colaborador` — JOIN
- `idx_ponto_data` — filtro por data
- `idx_ponto_tipo` — filtro por tipo

### Auditoria (`007_auditoria_logs.sql`)
- `idx_auditoria_tabela` — filtro por tabela
- `idx_auditoria_usuario` — filtro por usuário
- `idx_auditoria_data` — ordenação por data

---

## 4. Boas Práticas Aplicadas

1. **Índices parciais**: `idx_webhooks_evento_ativo` usa `WHERE ativo = TRUE` para reduzir tamanho do índice.
2. **Índices expressão**: `idx_escala_mes_mes_ano` indexa `EXTRACT()` para evitar seq scan.
3. **Ordem de colunas**: em compostos, a coluna de filtro (`WHERE`) precede a de ordenação (`ORDER BY`).
4. **Cobertura sem duplicação**: não recriamos índices já existentes; apenas complementamos lacunas.

---

## 5. Validação

```sh
# Backend
npm run build   # tsc limpo

# Supabase (produção/hostinger)
# Executar migration 009 após deploy:
# supabase migration up
```

---

## 6. Referências

- `supabase/migrations/009_indices_performance.sql` — migration executável
- `src/api/controllers/dashboard.controller.ts` — queries do dashboard
- `src/api/controllers/relatorios.controller.ts` — queries de exportação CSV
- Blueprint: `docs/piong-blueprint/03-mapa-funcional.md`

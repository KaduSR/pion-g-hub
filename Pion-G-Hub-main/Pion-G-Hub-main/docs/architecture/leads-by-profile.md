# Leads por Perfil — Arquitetura e Visibilidade

## Status

| Sprint | Descrição | Status |
|--------|-----------|--------|
| 2.3 | Vendedor sem item de leads no menu | ✅ Implementado |
| 2.4 | `created_by`, "Meus Leads", filtro por role no frontend | ✅ Implementado |
| Futura | RLS espelhando filtros do frontend | 🔲 Planejado |
| Futura | Filtro de equipe para gestor (depende do módulo Users) | 🔲 Planejado |

---

## Campo `created_by`

```sql
ALTER TABLE public.leads_feira
  ADD COLUMN IF NOT EXISTS created_by UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;
```

- **Nullable**: leads cadastrados antes desta sprint não têm `created_by`. Eles não aparecem em "Meus Leads" para nenhum vendedor — comportamento correto, pois não há como saber quem os cadastrou.
- **Preenchido em**: `LeadCapturePage` → `leadsService.create({ ..., created_by: user.id })`.
- **Não é o mesmo que o campo `vendedor` (texto livre)**: `vendedor` é um campo de exibição herdado do design original. `created_by` é o campo de controle de acesso, tipado como UUID e sempre confiável.

---

## Dois campos, dois propósitos

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `vendedor` | `TEXT` | Exibição na tabela; filtro textual por nome; histórico |
| `created_by` | `UUID → auth.users` | Controle de acesso; filtro de "Meus Leads" |

O campo `vendedor` continua sendo pré-populado com `profile.nome` na tela de captação (UX), mas o controle de visibilidade usa exclusivamente `created_by`.

---

## Lógica de visibilidade por role

### No `leadsService`

```js
// getAll: createdBy aplica .eq('created_by', uuid) quando fornecido
leadsService.getAll({ createdBy: user.id })  // vendedor: apenas os próprios
leadsService.getAll({})                       // admin/marketing: todos

// getDashboardStats: mesmo parâmetro
leadsService.getDashboardStats(fairId, user.id)  // vendedor
leadsService.getDashboardStats(fairId, null)      // demais
```

### Na `LeadsPage` e `DashboardPage`

```js
const isViewAll  = can('leads.view_all')
const isViewTeam = !isViewAll && can('leads.view_team')
const isViewOwn  = !isViewAll && !isViewTeam && can('leads.view_own')
```

| Condição | `createdBy` passado | Resultado |
|---|---|---|
| `isViewAll` (admin, marketing) | `undefined` | Todos os leads |
| `isViewTeam` (gestor) | `undefined` | Todos os leads¹ |
| `isViewOwn` (vendedor) | `user.id` | Apenas leads com `created_by = user.id` |

¹ Gestor recebe todos por enquanto — ver seção de limitações.

---

## Sidebar — label dinâmico

O item de menu `/leads` tem label resolvido em tempo de render:

```js
const leadsLabel = (!can('leads.view_all') && !can('leads.view_team'))
  ? 'Meus Leads'
  : 'Gestão de Leads'
```

| Role | Label na Sidebar |
|------|-----------------|
| admin | Gestão de Leads |
| marketing | Gestão de Leads |
| gestor | Gestão de Leads |
| vendedor | Meus Leads |

---

## Dashboard — visões por role

| Elemento | admin / marketing | gestor | vendedor |
|---|---|---|---|
| Título | "Dashboard" | "Dashboard" | "Meu Dashboard" |
| Subtítulo | "Visão geral…" | "Visão geral…"¹ | "Métricas dos seus próprios leads" |
| Filtro de feira | ✅ | ✅ | ❌ (oculto) |
| Cards de métricas | Todos os leads | Todos os leads¹ | Apenas os próprios |
| Gráfico "por vendedor" | ✅ | ✅ | ❌ (sem sentido para si mesmo) |
| Gráfico de temperatura | ✅ | ✅ | ✅ (dos próprios) |
| Gráfico por segmento | ✅ | ✅ | ✅ (dos próprios) |
| Gráfico por feira | ✅ | ✅ | ✅ (dos próprios) |

¹ Gestor ainda sem filtro de equipe — ver limitações.

---

## Limitações desta sprint

### Gestor sem filtro de equipe

O gestor (`leads.view_team`) deveria ver apenas os leads dos vendedores vinculados a ele via `gestor_id`. Isso não está implementado porque:

1. A coluna `gestor_id` existe em `user_profiles`, mas não há UI para atribuir vendedores a um gestor (depende do módulo Users).
2. A query de equipe exigiria um join: `leads onde created_by IN (SELECT user_id FROM user_profiles WHERE gestor_id = profile.id)`.

**Por enquanto**: gestor vê todos os leads, mesmo comportamento de admin/marketing. Isso é documentado como temporário.

**Pendência**: implementar o filtro de equipe quando o módulo Users (atribuição gestor→vendedor) estiver disponível.

### Leads históricos sem `created_by`

Leads cadastrados antes desta sprint têm `created_by = NULL`. Eles:
- Aparecem normalmente para admin, marketing e gestor (sem filtro por `created_by`).
- **Não aparecem** em "Meus Leads" para nenhum vendedor — não há como saber quem os cadastrou.

Isso é o comportamento correto e esperado. Não há plano de migração retroativa, pois o campo `vendedor` (texto) não é confiável para esse mapeamento.

### Sem RLS

O filtro `created_by = user.id` é aplicado apenas no frontend (query Supabase do cliente). Um usuário vendedor poderia remover o filtro via DevTools do browser e acessar todos os leads. Isso é resolvido na sprint de RLS.

---

## Próximos passos

### RLS para `leads_feira`

```sql
-- Exemplo ilustrativo — não aplicado nesta sprint
CREATE POLICY "leads_select_por_role" ON public.leads_feira
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND (
        up.role IN ('admin', 'marketing')
        OR (up.role = 'gestor' AND public.leads_feira.created_by IN (
              SELECT user_id FROM public.user_profiles
              WHERE gestor_id = up.id
            ))
        OR (up.role = 'vendedor' AND public.leads_feira.created_by = auth.uid())
      )
    )
  );
```

### Filtro de equipe para gestor

Quando o módulo Users existir e `gestor_id` puder ser atribuído via UI:

```js
// leadsService.getAll — novo parâmetro para o gestor
if (gestorId) {
  // subquery: leads cujo created_by pertence a um vendedor da equipe do gestor
  // Supabase não suporta subquery direta no client; usar RPC ou view materializada
}
```

### Campo `vendedor` normalizado

No futuro, considerar substituir `vendedor TEXT` por `vendedor_id UUID → auth.users`. Isso tornaria os dois campos (`created_by` e `vendedor`) convergentes — ou possivelmente redundantes.

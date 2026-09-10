import { AREAS } from '../areaRegistry'
import { useVisibleModules } from './useVisibleModules'

/**
 * Extraído da fundação da Sprint 5.1, Etapa 3 — combina `areaRegistry.js`
 * (a QUAL área cada módulo/item pertence) com `useVisibleModules()` (O QUE
 * o usuário atual pode ver) pra resolver quais ÁREAS realmente aparecem
 * pra ele. Não é uma terceira regra de autorização: toda decisão de
 * "visível ou não" já foi tomada por `useVisibleModules()` (que, por sua
 * vez, já aplica PBAC + a regra especial da Central de Atendimento) — este
 * hook só organiza esse resultado por área, sem repetir nem contornar
 * nenhuma checagem.
 *
 * IMPORTANTE: área nunca é tratada como autorização. `ROUTE_PERMISSIONS` +
 * `RequirePermission` continuam sendo a proteção real de acesso direto por
 * URL, numa etapa futura — este hook só organiza a experiência.
 */
export function useVisibleAreas(areas = AREAS) {
  const { visibleModules, isLoading } = useVisibleModules()

  // Resolve uma associação de area.items contra os módulos JÁ FILTRADOS
  // por useVisibleModules() — nunca contra MODULES bruto, pra não
  // reintroduzir um módulo ou item que o usuário não pode ver (isso
  // incluiria de volta, por exemplo, a Central de Atendimento pra quem não
  // tem vínculo operacional válido).
  const resolveAssociation = (assoc) => {
    const module = visibleModules.find((mod) => mod.id === assoc.moduleId)
    if (!module) return null

    // Associação de módulo inteiro (sem path): a referência já vem com
    // seu navigation devidamente filtrado — nada é reconstruído aqui.
    if (!assoc.path) {
      return { type: 'module', module }
    }

    // Associação de item específico: busca só dentro do navigation JÁ
    // FILTRADO do módulo (nunca em MODULES bruto) — comparação exata de
    // string, sem normalizar nem reescrever a query string.
    const item = (module.navigation || []).find((navItem) => navItem.path === assoc.path)
    if (!item) return null

    return { type: 'item', module, item }
  }

  // Cada área vira um objeto novo ({ ...area, resolvedItems }) — nunca
  // muta `areas`/`AREAS`, `area.items`, `visibleModules` ou
  // `module.navigation`. Áreas sem nenhuma associação resolvida são
  // completamente removidas (nunca aparecem "vazias"). Ordenação explícita
  // por `area.order`, não a ordem de declaração do array.
  const visibleAreas = areas
    .map((area) => ({
      ...area,
      resolvedItems: (area.items || []).map(resolveAssociation).filter(Boolean),
    }))
    .filter((area) => area.resolvedItems.length > 0)
    .sort((a, b) => a.order - b.order)

  // Etapa 3.1: só repassa o mesmo isLoading de useVisibleModules — nenhuma
  // área é escondida, adicionada ou reconstruída por causa dele. Durante o
  // carregamento, "Departamento de TI" já fica fora de visibleAreas (o
  // item /ti?view=central não resolve, fail-closed herdado do hook
  // anterior); isLoading só existe pra quem consumir este hook distinguir
  // esse estado de "realmente sem acesso" antes de redirecionar.
  return { visibleAreas, isLoading }
}

import { useVisibleAreas } from './useVisibleAreas'

/**
 * Sprint 5.1, Etapa 6.1 — transforma o resultado de useVisibleAreas() numa
 * lista PLANA de itens de navegação por área, pronta para a Sidebar
 * desenhar. Nenhuma decisão de autorização vive aqui — isso já foi
 * resolvido integralmente por useVisibleAreas()/useVisibleModules(); este
 * hook só reformata apresentação (label/path/ícone/contexto), a mesma
 * fronteira já usada entre os hooks de dados e os componentes de UI
 * (AreaCard.jsx/AreaAccessCard.jsx).
 *
 * Decisões de negócio aplicadas aqui (aprovadas explicitamente, não
 * decididas por este hook):
 *   1. Itens `planned` não aparecem — na prática isso já é garantido pela
 *      própria fonte: areaRegistry.js nunca referencia um item com
 *      status 'planned', então resolvedItems jamais os contém. Nenhum
 *      filtro adicional é necessário ou foi adicionado.
 *   2. Um resolvedItem `type: 'module'` (módulo inteiro, ex.: Gestão de
 *      Brindes) vira UMA única linha (nome + path do módulo) — nunca
 *      percorre `module.navigation`. A Sidebar representa capacidades de
 *      negócio, não um sitemap das abas internas de cada módulo.
 */
export function useAreaNavigation() {
  const { visibleAreas, isLoading } = useVisibleAreas()

  const areaNavigation = visibleAreas.map((area) => ({
    id: area.id,
    name: area.name,
    icon: area.icon,
    order: area.order,
    navigationItems: area.resolvedItems.map((resolvedItem) => {
      if (resolvedItem.type === 'module') {
        const { module } = resolvedItem
        return {
          key: `module-${module.id}`,
          label: module.name,
          path: module.path,
          icon: module.icon,
          context: null,
          sourceType: 'module',
        }
      }

      const { module, item } = resolvedItem
      return {
        key: `item-${item.path}`,
        label: item.label,
        path: item.path,
        icon: item.icon || module.icon,
        context: module.name,
        sourceType: 'item',
      }
    }),
  }))

  return { areaNavigation, isLoading }
}

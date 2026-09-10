import { usePermissions } from '../../permissions/contexts/PermissionsContext'
import { useCentralAtendimentoAccess } from '../../tickets/hooks/useCentralAtendimentoAccess'
import { MODULES } from '../moduleRegistry'

// Mesmo path especial que a Sidebar já usava antes desta extração (Sprint
// 5.1, Etapa 2) — a Central de Atendimento (Chamados de TI) tem uma regra
// de visibilidade própria (PBAC + vínculo ativo em ti_equipe_membros), não
// só canAny como os demais itens. Nenhum outro item precisa disso hoje.
const CENTRAL_ATENDIMENTO_PATH = '/ti?view=central'

/**
 * Extraído de Sidebar.jsx (Sprint 5.1, Etapa 2) — única fonte de verdade
 * pra "quais módulos e itens de moduleRegistry.js o usuário atual pode
 * ver". Comportamento idêntico ao que já vivia embutido na Sidebar, só
 * relocado — nenhuma regra de autorização nova, nenhuma mudança de
 * comportamento. Não decide nada de layout/estado (expansão, flyout,
 * colapso, destaque de rota ativa) — isso continua exclusivamente na
 * Sidebar.
 *
 * `isModuleVisible`/`isItemVisible` continuam expostos (além do array já
 * filtrado) porque uma consulta futura por um path específico (ex.: via
 * areaRegistry.js, que referencia moduleId+path) precisa da mesma regra
 * usada aqui, sem duplicá-la.
 */
export function useVisibleModules(modules = MODULES) {
  const { canAny } = usePermissions()
  const centralAccess = useCentralAtendimentoAccess()

  // Item ativo só aparece se o usuário tiver alguma das permissões
  // listadas; planejado sempre aparece (quem consome decide como desenhar
  // "Em breve"). Exceção: "Central de Atendimento" usa a regra própria
  // (PBAC + vínculo ativo em equipe) em vez do canAny genérico — nunca
  // fica "oculta mas acessível" pra quem não passa nessa regra.
  const isItemVisible = (item) => {
    if (item.status !== 'active') return true
    if (item.path === CENTRAL_ATENDIMENTO_PATH) return !centralAccess.loading && centralAccess.hasAccess
    return !item.permissions?.length || canAny(item.permissions)
  }

  // Macro módulo aparece se tiver QUALQUER submódulo ativo liberado para o
  // usuário, OU se for inteiramente planejado (roadmap pra todo
  // autenticado). Deliberadamente NÃO reaproveita isItemVisible aqui —
  // preserva o comportamento exato de antes da extração, em que o módulo
  // "Chamados de TI" já aparecia por canAny genérico no item da Central,
  // mesmo sem vínculo de equipe (só o ITEM da Central, dentro do módulo já
  // visível, é que aplicava a regra especial). Mudar isso mudaria
  // comportamento existente, o que esta etapa não deve fazer.
  const isModuleVisible = (mod) => {
    const activeItems = (mod.navigation || []).filter((item) => item.status === 'active')
    if (activeItems.length === 0) return true
    return activeItems.some((item) => !item.permissions?.length || canAny(item.permissions))
  }

  // Módulos visíveis, cada um já com `navigation` contendo só os itens
  // visíveis (nunca o objeto original de moduleRegistry.js — sempre uma
  // cópia rasa nova, MODULES nunca é mutado).
  const visibleModules = modules
    .filter(isModuleVisible)
    .map((mod) => ({ ...mod, navigation: (mod.navigation || []).filter(isItemVisible) }))

  // Etapa 3.1: expõe explicitamente que a verificação operacional da
  // Central de Atendimento (useCentralAtendimentoAccess) ainda está em
  // andamento — nunca concede acesso por si só (isItemVisible continua
  // fail-closed durante o loading, inalterado), só permite que quem
  // consumir este hook distinga "ainda carregando" de "realmente sem
  // acesso" antes de decidir redirecionar.
  return { visibleModules, isModuleVisible, isItemVisible, isLoading: centralAccess.loading }
}

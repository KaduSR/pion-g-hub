import { useState, useEffect } from 'react'
import { usePermissions } from '../../permissions/contexts/PermissionsContext'
import { useProfileContext } from '../../profiles/contexts/ProfileContext'
import { PERMISSIONS } from '../../permissions/constants/permissions'
import { ticketsService } from '../services/ticketsService'

// view_all/manage_all enxergam a Central independente de vínculo de
// equipe (administram tudo). view_team/manage_team/triage só liberam a
// Central se o usuário também for membro ATIVO de alguma equipe — PBAC
// sozinho não basta pra esse segundo grupo, precisa do vínculo real em
// ti_equipe_membros (regra explícita da revisão de navegação).
const GLOBAL_PERMISSIONS = [PERMISSIONS.TICKETS_VIEW_ALL, PERMISSIONS.TICKETS_MANAGE_ALL]
const TEAM_SCOPED_PERMISSIONS = [PERMISSIONS.TICKETS_VIEW_TEAM, PERMISSIONS.TICKETS_MANAGE_TEAM, PERMISSIONS.TICKETS_TRIAGE]

/**
 * Única fonte de verdade pra "este usuário pode ver a Central de
 * Atendimento" — usada pela Sidebar (visibilidade do item de navegação) e
 * por TicketsDashboard (view padrão e guarda de URL). Nunca usa
 * profile.role, setor ou cargo — só PBAC (via usePermissions, que já lê do
 * banco) + vínculo ativo em ti_equipe_membros (via
 * ticketsService.hasActiveTeamMembership, RLS-safe, sem RPC nova).
 */
export function useCentralAtendimentoAccess() {
  const { profile } = useProfileContext()
  const { canAny, loading: permsLoading } = usePermissions()
  const [membershipLoading, setMembershipLoading] = useState(true)
  const [hasMembership, setHasMembership] = useState(false)

  const hasGlobal = !permsLoading && canAny(GLOBAL_PERMISSIONS)
  const hasTeamScoped = !permsLoading && canAny(TEAM_SCOPED_PERMISSIONS)

  useEffect(() => {
    // Só precisa checar o vínculo quando a permissão em jogo é a
    // "condicional" — quem já tem view_all/manage_all nunca depende disso,
    // e quem não tem nenhuma permissão relevante também não precisa da
    // consulta extra.
    if (permsLoading || hasGlobal || !hasTeamScoped || !profile?.id) {
      setMembershipLoading(false)
      return
    }
    let cancelled = false
    setMembershipLoading(true)
    ticketsService.hasActiveTeamMembership(profile.id)
      .then((result) => { if (!cancelled) setHasMembership(result) })
      .catch(() => { if (!cancelled) setHasMembership(false) })
      .finally(() => { if (!cancelled) setMembershipLoading(false) })
    return () => { cancelled = true }
  }, [permsLoading, hasGlobal, hasTeamScoped, profile?.id])

  const loading = permsLoading || (hasTeamScoped && !hasGlobal && membershipLoading)
  const hasAccess = hasGlobal || (hasTeamScoped && hasMembership)

  return { loading, hasAccess }
}

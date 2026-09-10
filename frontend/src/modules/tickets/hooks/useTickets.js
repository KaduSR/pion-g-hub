import { useState, useEffect, useCallback } from 'react'
import { ticketsService, STATUS_BUCKETS } from '../services/ticketsService'
import { useProfileContext } from '../../profiles/contexts/ProfileContext'

/**
 * Estado da tela "Minhas solicitações" (dashboard + lista, seções 1 e 4 da
 * especificação — só existe uma página pras duas, TicketsDashboard.jsx).
 * Mantém contadores e lista filtrável/pesquisável/ordenável juntos porque
 * as duas coisas recarregam do mesmo jeito após criar/comentar um chamado.
 * `getMyTickets`/`getDashboardStats` já filtram só pelos chamados em que o
 * usuário é solicitante (RLS view_own) — nunca inclui um chamado só porque
 * foi atribuído a ele como técnico (isso é escopo da Central de
 * Atendimento, visão separada).
 */
export function useTickets() {
  const { profile } = useProfileContext()
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState({ aberto: 0, andamento: 0, concluido: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [filter, setFilter] = useState('todos') // 'todos' | 'aberto' | 'andamento' | 'concluido'
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('recent') // 'recent' | 'oldest' | 'priority' | 'updated'

  const load = useCallback(async () => {
    // Sem profile.id ainda carregado, não busca nada — evita chamar
    // getMyTickets()/getDashboardStats() sem o filtro de dono (ver
    // ticketsService.js) e, por um instante, misturar chamados de outra
    // pessoa numa tela que deveria mostrar só os próprios.
    if (!profile?.id) return
    setLoading(true)
    setError(null)
    try {
      const statuses = filter === 'todos' ? undefined : STATUS_BUCKETS[filter]
      const [ticketsData, statsData] = await Promise.all([
        ticketsService.getMyTickets({ solicitanteProfileId: profile.id, statuses, search, sort }),
        ticketsService.getDashboardStats(profile.id),
      ])
      setTickets(ticketsData)
      setStats(statsData)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, filter, search, sort])

  useEffect(() => { load() }, [load])

  return {
    tickets, stats, loading, error, reload: load,
    filter, setFilter, search, setSearch, sort, setSort,
  }
}

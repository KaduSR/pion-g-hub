import { useState, useEffect, useCallback } from 'react'
import { ticketsService } from '../services/ticketsService'

const PAGE_SIZE = 20

/**
 * Estado da fila operacional (Central de Atendimento, Sprint 4.3) — busca
 * SEMPRE via ticketsService.getServiceQueue() (RPC ti_fila_atendimento),
 * nunca uma tabela inteira de uma vez: cada mudança de filtro volta pra
 * página 0, e "reload()" refaz a página atual (usado depois de triagem/
 * atribuição/mudança de status, sem perder a posição do usuário na fila).
 */
export function useServiceQueue() {
  const [items, setItems] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [filters, setFilters] = useState({
    equipeId: '',
    status: '',
    prioridade: '',
    categoriaId: '',
    responsavelProfileId: '',
    semResponsavel: false,
    search: '',
  })

  const updateFilters = (partial) => {
    setPage(0)
    setFilters((f) => ({ ...f, ...partial }))
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await ticketsService.getServiceQueue({
        equipeId: filters.equipeId || undefined,
        status: filters.status || undefined,
        prioridade: filters.prioridade || undefined,
        categoriaId: filters.categoriaId || undefined,
        responsavelProfileId: filters.responsavelProfileId || undefined,
        semResponsavel: filters.semResponsavel || undefined,
        search: filters.search || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })

      // Uma única consulta em lote pros IDs desta página (nunca por
      // chamado) pra saber quais têm nota interna — ver comentário de
      // getChamadosComNotaInterna() no service.
      const comNotaInterna = await ticketsService.getChamadosComNotaInterna(
        result.items.map((item) => item.id)
      )
      setItems(result.items.map((item) => ({ ...item, hasInternalNote: comNotaInterna.has(item.id) })))
      setHasMore(result.hasMore)
    } catch (e) {
      setError(e.message || 'Erro ao carregar a fila de atendimento.')
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => { load() }, [load])

  return {
    items, loading, error, reload: load,
    filters, setFilters: updateFilters,
    page, setPage, hasMore, pageSize: PAGE_SIZE,
  }
}

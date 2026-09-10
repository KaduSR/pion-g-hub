import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'pion_g_atendimento_feira_id'

/**
 * Feira selecionada para operar o Autoatendimento interno. Persistida em
 * localStorage (não há Context global de "feira atual" no projeto hoje —
 * cada página mantém seu próprio feira_id local) pra sobreviver a um
 * refresh acidental do tablet no meio do evento. Some do CHECK contra
 * `activeFairs` sempre que a lista carrega — se a feira salva não estiver
 * mais "Planejada"/"Em andamento", a seleção é limpa automaticamente.
 */
export function useSelectedFair(activeFairs) {
  const [selectedFairId, setSelectedFairId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || ''
    } catch (_) {
      return ''
    }
  })

  useEffect(() => {
    if (!selectedFairId || !activeFairs || activeFairs.length === 0) return
    const stillActive = activeFairs.some((f) => f.id === selectedFairId)
    if (!stillActive) {
      setSelectedFairId('')
      try { localStorage.removeItem(STORAGE_KEY) } catch (_) { /* ignora */ }
    }
  }, [activeFairs, selectedFairId])

  const selectFair = useCallback((fairId) => {
    setSelectedFairId(fairId)
    try {
      if (fairId) localStorage.setItem(STORAGE_KEY, fairId)
      else localStorage.removeItem(STORAGE_KEY)
    } catch (_) { /* ignora — localStorage indisponível não deve travar o fluxo */ }
  }, [])

  const selectedFair = (activeFairs || []).find((f) => f.id === selectedFairId) || null

  return { selectedFairId, selectedFair, selectFair }
}

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fairsService } from '../services/fairsService'

const FairsContext = createContext(null)

export function FairsProvider({ children }) {
  const [activeFairs, setActiveFairs] = useState([])
  const [allFairs, setAllFairs]       = useState([])
  const [loadingFairs, setLoadingFairs] = useState(true)

  const loadFairs = useCallback(async () => {
    setLoadingFairs(true)
    try {
      const [active, all] = await Promise.all([
        fairsService.getActive(),
        fairsService.getAll(),
      ])
      setActiveFairs(active)
      setAllFairs(all)
    } catch (e) {
      console.error('[FairsContext] Erro ao carregar feiras:', e)
    } finally {
      setLoadingFairs(false)
    }
  }, [])

  useEffect(() => { loadFairs() }, [loadFairs])

  return (
    <FairsContext.Provider value={{ activeFairs, allFairs, loadingFairs, refreshFairs: loadFairs }}>
      {children}
    </FairsContext.Provider>
  )
}

export const useFairsContext = () => {
  const ctx = useContext(FairsContext)
  if (!ctx) throw new Error('useFairsContext must be used within FairsProvider')
  return ctx
}

import { createContext, useContext } from 'react'
import { useSettings, DEFAULT_SETTINGS } from '../hooks/useSettings'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const hook = useSettings()

  return (
    <SettingsContext.Provider value={hook}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider')
  return ctx
}

export { DEFAULT_SETTINGS }

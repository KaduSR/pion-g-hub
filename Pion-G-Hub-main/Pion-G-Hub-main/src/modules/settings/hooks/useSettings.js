import { useState, useEffect, useCallback } from 'react'
import { settingsService } from '../services/settingsService'

export const DEFAULT_SETTINGS = {
  nome_sistema: 'Pion G Plus',
  subtitulo:    'Leads & Feiras',
  cor_primaria: '#1B3A6B',
  logo_url:     null,
}

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await settingsService.get()
      if (data) setSettings({ ...DEFAULT_SETTINGS, ...data })
    } catch (e) {
      setError(e.message)
      // não bloqueia o app — usa defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /**
   * Salva configurações e opcionalmente faz upload de logo.
   * @param {object} values        - campos do formulário
   * @param {File|null} logoFile   - arquivo de imagem ou null
   */
  const saveSettings = async (values, logoFile = null) => {
    let logo_url = values.logo_url ?? settings.logo_url

    if (logoFile) {
      // remove logo anterior antes de enviar a nova
      if (settings.logo_url) {
        await settingsService.deleteLogo(settings.logo_url)
      }
      logo_url = await settingsService.uploadLogo(logoFile)
    }

    const saved = await settingsService.save({ ...values, logo_url })
    setSettings({ ...DEFAULT_SETTINGS, ...saved })
    return saved
  }

  const removeLogo = async () => {
    await settingsService.deleteLogo(settings.logo_url)
    const saved = await settingsService.save({ ...settings, logo_url: null })
    setSettings({ ...DEFAULT_SETTINGS, ...saved })
  }

  return { settings, loading, error, reload: load, saveSettings, removeLogo }
}

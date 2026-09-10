import { useState, useEffect, useRef, useCallback } from 'react'

const TTL_MS = 4 * 60 * 60 * 1000 // 4h — cobre um turno/dia de evento
const AUTOSAVE_DEBOUNCE_MS = 400

function isBlank(form, emptyForm) {
  return Object.keys(emptyForm).every((key) => (form[key] || '') === (emptyForm[key] || ''))
}

function readDraft(storageKey) {
  try {
    const raw = sessionStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !parsed.form || !parsed.savedAt) return null
    if (Date.now() - parsed.savedAt > TTL_MS) {
      sessionStorage.removeItem(storageKey)
      return null
    }
    return parsed.form
  } catch (_) {
    return null
  }
}

function writeDraft(storageKey, form) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify({ form, savedAt: Date.now() }))
  } catch (_) { /* sessionStorage indisponível não deve travar o formulário */ }
}

function clearDraft(storageKey) {
  try {
    sessionStorage.removeItem(storageKey)
  } catch (_) { /* ignora */ }
}

/**
 * Protege formulários de lead do stand contra perda de preenchimento por
 * reload/F5/atualização de deploy na mesma aba. Usa sessionStorage (não
 * localStorage) de propósito: os dados contêm nome/empresa/telefone do
 * visitante, e os tablets do stand são compartilhados — sessionStorage não
 * sobrevive ao fechamento da aba/navegador, então não vira um resíduo de
 * dados pessoais no dispositivo depois que a sessão operacional acaba.
 *
 * `storageKey` deve já vir isolada por formulário + feira (ex.:
 * `pion_g_lead_draft_atendimento_<feiraId>`) para nunca restaurar dados de
 * uma feira errada.
 */
export function useLeadDraft(storageKey, emptyForm) {
  const [restoredNotice, setRestoredNotice] = useState(false)
  const debounceRef = useRef(null)
  const skipNextSaveRef = useRef(false)

  const restoreDraft = useCallback(() => {
    if (!storageKey) return null
    const draft = readDraft(storageKey)
    if (draft) {
      skipNextSaveRef.current = true
      setRestoredNotice(true)
    }
    return draft
  }, [storageKey])

  const saveDraft = useCallback((form) => {
    if (!storageKey) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (isBlank(form, emptyForm)) return
      writeDraft(storageKey, form)
    }, AUTOSAVE_DEBOUNCE_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  const discardDraft = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (storageKey) clearDraft(storageKey)
    setRestoredNotice(false)
  }, [storageKey])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  return { restoreDraft, saveDraft, discardDraft, restoredNotice, dismissRestoredNotice: () => setRestoredNotice(false) }
}

import { useState, useEffect, useCallback } from 'react'
import { leadsService } from '../services/leadsService'

export function useLeads(filters = {}) {
  const [leads, setLeads]     = useState([])
  const [total, setTotal]     = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await leadsService.getAll(filters)
      setLeads(result.data || [])
      setTotal(result.count || 0)
      setTotalPages(result.totalPages || 0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => { load() }, [load])

  const createLead = async (payload) => {
    return await leadsService.create(payload)
  }

  const updateLead = async (id, payload) => {
    const updated = await leadsService.update(id, payload)
    setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)))
    return updated
  }

  const removeLead = async (id) => {
    await leadsService.remove(id)
    setLeads((prev) => prev.filter((l) => l.id !== id))
    setTotal((t) => t - 1)
  }

  return { leads, loading, error, total, totalPages, reload: load, createLead, updateLead, removeLead }
}

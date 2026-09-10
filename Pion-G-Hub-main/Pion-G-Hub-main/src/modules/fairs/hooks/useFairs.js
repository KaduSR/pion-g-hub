import { useState, useEffect, useCallback } from 'react'
import { fairsService } from '../services/fairsService'

export function useFairs() {
  const [fairs, setFairs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fairsService.getAll()
      setFairs(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createFair = async (payload) => {
    const created = await fairsService.create(payload)
    setFairs((prev) => [created, ...prev])
    return created
  }

  const updateFair = async (id, payload) => {
    const updated = await fairsService.update(id, payload)
    setFairs((prev) => prev.map((f) => (f.id === id ? updated : f)))
    return updated
  }

  const removeFair = async (id) => {
    await fairsService.remove(id)
    setFairs((prev) => prev.filter((f) => f.id !== id))
  }

  return { fairs, loading, error, reload: load, createFair, updateFair, removeFair }
}

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Search } from 'lucide-react'
import { giftMovementsService } from '../services/giftMovementsService'
import { fairsService } from '../../fairs/services/fairsService'
import { MovementModal } from './MovementModal'
import { useProfileContext } from '../../profiles/contexts/ProfileContext'
import { FormField, Input, Select, Button } from '../../../shared/components/FormField'
import { Badge } from '../../../shared/components/Badge'
import { formatDateTime } from '../../../shared/utils/helpers'
import { CONTEXTOS, formatTipoMovimentacao, formatContexto } from '../constants/giftConstants'

const TIPO_COLORS = {
  entrada: { color: '#059669', bg: '#ecfdf5' },
  devolucao: { color: '#059669', bg: '#ecfdf5' },
  saida: { color: '#dc2626', bg: '#fef2f2' },
  perda: { color: '#dc2626', bg: '#fef2f2' },
  ajuste: { color: '#d97706', bg: '#fffbeb' },
}

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'all', label: 'Todo período' },
]

// Movimentações é tela histórica/administrativa (não operação momentânea
// de uma feira, diferente do P1.3) — 30 dias dá visão útil ao abrir sem
// trazer o histórico inteiro por padrão.
const DEFAULT_FILTERS = { search: '', tipo: 'all', contexto: 'all', feira: 'all', period: '30d' }

export function MovementsListTab({ showToast }) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [fairs, setFairs] = useState([])
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const { profile } = useProfileContext()
  const requestIdRef = useRef(0)

  useEffect(() => {
    // Todas as feiras (não só ativas) — Movimentações é histórico, feiras
    // já Finalizadas continuam relevantes para o filtro. Mesmo padrão já
    // usado em MovementModal.jsx para o mesmo propósito.
    fairsService.getAll().then(setFairs).catch(() => setFairs([]))
  }, [])

  // Só o período dispara nova consulta (é o único filtro server-side).
  // Protegido contra respostas fora de ordem: se o usuário trocar o
  // período rapidamente, só a resposta da última requisição disparada é
  // aplicada — uma resposta antiga que chegue depois é descartada.
  const load = async (period) => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(false)
    try {
      const data = await giftMovementsService.getAll({ period })
      if (requestIdRef.current !== requestId) return
      setMovements(data)
    } catch (err) {
      if (requestIdRef.current !== requestId) return
      setError(true)
      setMovements([])
      showToast('Erro ao carregar movimentações.', 'error')
    } finally {
      if (requestIdRef.current === requestId) setLoading(false)
    }
  }

  useEffect(() => { load(filters.period) }, [filters.period])

  const handleSave = async (payload) => {
    await giftMovementsService.create({
      ...payload,
      createdBy: profile?.id,
      responsavelProfileId: profile?.id,
    })
    showToast('Movimentação registrada com sucesso!')
    load(filters.period)
  }

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))

  const isDefaultFilters = Object.keys(DEFAULT_FILTERS).every((key) => filters[key] === DEFAULT_FILTERS[key])
  const clearFilters = () => setFilters(DEFAULT_FILTERS)

  // Todos os contextos conhecidos (CONTEXTOS) sempre disponíveis — nunca
  // dependem do período carregado, então uma seleção não desaparece do
  // Select ao trocar de período (mesmo que o novo período não tenha
  // nenhuma movimentação daquele contexto — nesse caso o resultado é
  // zero, explicitamente, não um filtro "fantasma" invisível). Valores
  // desconhecidos (contexto_tipo sem CHECK no banco, fora da lista
  // fechada) presentes no período atual são preservados via formatContexto
  // (fallback defensivo). Se o contexto SELECIONADO for um desconhecido
  // que não está no período atual (ex.: usuário trocou de período depois
  // de selecionar), ele também é preservado explicitamente — senão a
  // option some do Select mesmo com filters.contexto ainda apontando pra
  // ele, virando um filtro "fantasma" invisível.
  const availableContexts = useMemo(() => {
    const known = CONTEXTOS.map((c) => ({ value: c.value, label: c.label }))
    const knownValues = new Set(known.map((c) => c.value))

    const unknownValues = new Set()
    for (const mov of movements) {
      if (mov.contexto_tipo && !knownValues.has(mov.contexto_tipo)) {
        unknownValues.add(mov.contexto_tipo)
      }
    }

    if (filters.contexto !== 'all' && !knownValues.has(filters.contexto)) {
      unknownValues.add(filters.contexto)
    }

    const unknown = Array.from(unknownValues)
      .map((value) => ({ value, label: formatContexto(value) }))
      .sort((a, b) => a.label.localeCompare(b.label))

    return [...known, ...unknown]
  }, [movements, filters.contexto])

  const searchTerm = filters.search.trim().toLowerCase()

  const filteredMovements = useMemo(() => {
    return movements.filter((mov) => {
      if (searchTerm && !(mov.brindes?.nome || '').toLowerCase().includes(searchTerm)) return false
      if (filters.tipo !== 'all' && mov.tipo !== filters.tipo) return false
      if (filters.contexto !== 'all' && mov.contexto_tipo !== filters.contexto) return false
      if (filters.feira !== 'all' && mov.feira_id !== filters.feira) return false
      return true
    })
  }, [movements, searchTerm, filters.tipo, filters.contexto, filters.feira])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button onClick={() => setIsCreating(true)}>
          <Plus size={16} /> Nova movimentação
        </Button>
      </div>

      <div style={{
        background: '#fff', borderRadius: 14, padding: 16,
        border: '1px solid #f1f5f9', marginBottom: 16,
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end',
      }}>
        <FormField label="Buscar produto" style={{ marginBottom: 0, minWidth: 200, flex: '1 1 200px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <Input value={filters.search} onChange={setFilter('search')} placeholder="Buscar produto..." style={{ paddingLeft: 36 }} />
          </div>
        </FormField>

        <FormField label="Tipo" style={{ marginBottom: 0, minWidth: 150 }}>
          <Select value={filters.tipo} onChange={setFilter('tipo')}>
            <option value="all">Todos os tipos</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="ajuste">Ajuste</option>
            <option value="perda">Perda</option>
            <option value="devolucao">Devolução</option>
          </Select>
        </FormField>

        <FormField label="Contexto" style={{ marginBottom: 0, minWidth: 170 }}>
          <Select value={filters.contexto} onChange={setFilter('contexto')}>
            <option value="all">Todos os contextos</option>
            {availableContexts.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Feira" style={{ marginBottom: 0, minWidth: 170 }}>
          <Select value={filters.feira} onChange={setFilter('feira')}>
            <option value="all">Todas as feiras</option>
            {fairs.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Período" style={{ marginBottom: 0, minWidth: 140 }}>
          <Select value={filters.period} onChange={setFilter('period')}>
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
        </FormField>

        <Button variant="secondary" size="sm" onClick={clearFilters} disabled={isDefaultFilters}>
          Limpar filtros
        </Button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Data</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Brinde</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Tipo</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Quantidade</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Contexto</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Carregando movimentações...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#dc2626' }}>Erro ao carregar movimentações.</td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhuma movimentação registrada no período.</td></tr>
              ) : filteredMovements.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhuma movimentação encontrada para os filtros selecionados.</td></tr>
              ) : (
                filteredMovements.map((mov) => {
                  const colors = TIPO_COLORS[mov.tipo] || { color: '#64748b', bg: '#f1f5f9' }
                  return (
                    <tr key={mov.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{formatDateTime(mov.created_at)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{mov.brindes?.nome || 'Brinde removido'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge color={colors.color} bg={colors.bg}>{formatTipoMovimentacao(mov.tipo)}</Badge>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>{mov.quantidade}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                        {formatContexto(mov.contexto_tipo)}{mov.feiras?.nome ? ` — ${mov.feiras.nome}` : ''}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{mov.motivo || '-'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MovementModal isOpen={isCreating} onClose={() => setIsCreating(false)} onSave={handleSave} />
    </div>
  )
}

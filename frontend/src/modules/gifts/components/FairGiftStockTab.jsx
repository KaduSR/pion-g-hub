import React, { useState, useEffect } from 'react'
import { Plus, PackageOpen, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { fairGiftStockService, computeSaldo } from '../services/fairGiftStockService'
import { giftsService } from '../services/giftsService'
import { giftKitsService } from '../services/giftKitsService'
import { fairKitsService } from '../services/fairKitsService'
import { fairsService } from '../../fairs/services/fairsService'
import { useProfileContext } from '../../profiles/contexts/ProfileContext'
import { Modal } from '../../../shared/components/Modal'
import { FormField, Input, Textarea, Select, Button } from '../../../shared/components/FormField'
import { Badge } from '../../../shared/components/Badge'
import { GiftThumbnail } from './GiftThumbnail'
import { FairGiftIndicators } from './FairGiftIndicators'

const addStockInitialForm = { brinde_id: '', quantidade: '', observacoes: '' }

/**
 * Preparação da carga de uma feira (Sprint 3.7): quanto de cada brinde foi
 * enviado para o estande. Restrito a quem tem gifts.manage — vendedor só
 * enxerga o saldo já pronto na aba Entregas, nunca ajusta carga aqui.
 */
export function FairGiftStockTab({ showToast }) {
  const [fairs, setFairs] = useState([])
  const [feiraId, setFeiraId] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [addForm, setAddForm] = useState(addStockInitialForm)
  const [gifts, setGifts] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [origins, setOrigins] = useState({})
  const [originsError, setOriginsError] = useState(false)
  const [expandedRowId, setExpandedRowId] = useState(null)
  const { profile } = useProfileContext()

  // P2: kits associados à feira selecionada. allKits vem de giftKitsService
  // (catálogo ativo completo); associatedKitIds vem de fairKitsService
  // (fonte canônica da associação). selectedKitIds é o estado local do
  // checkbox, reidratado a cada troca de feira — nunca herda seleção da
  // feira anterior.
  const [allKits, setAllKits] = useState([])
  const [associatedKitIds, setAssociatedKitIds] = useState([])
  const [selectedKitIds, setSelectedKitIds] = useState([])
  const [kitsLoading, setKitsLoading] = useState(false)
  const [kitsError, setKitsError] = useState('')
  const [savingKits, setSavingKits] = useState(false)

  const searchTerm = search.trim().toLowerCase()
  const filteredRows = searchTerm
    ? rows.filter((row) => (row.brindes?.nome || '').toLowerCase().includes(searchTerm))
    : rows

  useEffect(() => {
    fairsService.getActive().then(setFairs).catch(() => setFairs([]))
  }, [])

  // P1.2: origem (kit x avulso) carregada junto com a carga, numa única
  // consulta por feira (nunca por linha) — falha em origins não derruba a
  // tabela de carga (P1.1), só fica sem detalhamento disponível.
  const loadRows = async (id) => {
    if (!id) { setRows([]); setOrigins({}); setOriginsError(false); return }
    setLoading(true)
    setOriginsError(false)
    try {
      const [stockData, originsData] = await Promise.all([
        fairGiftStockService.getByFair(id),
        fairGiftStockService.getDeliveryOriginsByFair(id).catch(() => {
          setOriginsError(true)
          return {}
        }),
      ])
      setRows(stockData)
      setOrigins(originsData)
    } catch (err) {
      showToast('Erro ao carregar carga da feira.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRows(feiraId) }, [feiraId])

  // P2: catálogo de kits ativos carregado uma vez (independe da feira);
  // associação carregada por feira, junto com a carga. Falha em kits não
  // derruba a carga (P1.1) — só desabilita a seção nova, mesmo padrão já
  // usado para origins (P1.2) acima.
  useEffect(() => {
    giftKitsService.getAll({ ativo: true }).then(setAllKits).catch(() => setAllKits([]))
  }, [])

  const loadFairKits = async (id) => {
    if (!id) { setAssociatedKitIds([]); setSelectedKitIds([]); setKitsError(''); return }
    setKitsLoading(true)
    setKitsError('')
    try {
      const ids = await fairKitsService.getByFair(id)
      setAssociatedKitIds(ids)
      setSelectedKitIds(ids)
    } catch (err) {
      setKitsError('Erro ao carregar kits desta feira.')
      setAssociatedKitIds([])
      setSelectedKitIds([])
    } finally {
      setKitsLoading(false)
    }
  }

  useEffect(() => { loadFairKits(feiraId) }, [feiraId])

  const toggleKitSelection = (kitId) => {
    setSelectedKitIds((prev) => (
      prev.includes(kitId) ? prev.filter((id) => id !== kitId) : [...prev, kitId]
    ))
  }

  const hasNoFairKits = associatedKitIds.length === 0
  const kitSelectionChanged = (
    selectedKitIds.length !== associatedKitIds.length
    || selectedKitIds.some((id) => !associatedKitIds.includes(id))
  )

  const handleSaveFairKits = async () => {
    if (savingKits) return
    if (selectedKitIds.length === 0) {
      setKitsError('Selecione pelo menos um kit para esta feira.')
      return
    }
    setKitsError('')
    setSavingKits(true)
    try {
      await fairKitsService.setForFair(feiraId, selectedKitIds)
      showToast('Kits da feira atualizados com sucesso!')
      await loadFairKits(feiraId)
    } catch (err) {
      setKitsError(err.message || 'Erro ao salvar kits da feira.')
    } finally {
      setSavingKits(false)
    }
  }

  const openAddModal = () => {
    setAddForm(addStockInitialForm)
    setError('')
    giftsService.getActive().then(setGifts).catch(() => setGifts([]))
    setIsAdding(true)
  }

  const handleAddChange = (field) => (e) => {
    const value = e.target.value
    setAddForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (saving) return

    if (!addForm.brinde_id) {
      setError('Selecione um brinde.')
      return
    }
    if (!addForm.quantidade || Number(addForm.quantidade) <= 0) {
      setError('Informe uma quantidade maior que zero.')
      return
    }

    setError('')
    setSaving(true)
    try {
      await fairGiftStockService.addStock({
        feiraId,
        brindeId: addForm.brinde_id,
        quantidade: Number(addForm.quantidade),
        observacoes: addForm.observacoes.trim(),
        createdBy: profile?.id,
      })
      showToast('Carga enviada para a feira!')
      setIsAdding(false)
      loadRows(feiraId)
    } catch (err) {
      setError(err.message || 'Erro ao registrar carga.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <FormField label="Feira" style={{ marginBottom: 0, minWidth: 280 }}>
            <Select value={feiraId} onChange={(e) => { setFeiraId(e.target.value); setSearch(''); setExpandedRowId(null) }}>
              <option value="">Selecione uma feira</option>
              {fairs.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </Select>
          </FormField>

          {feiraId && (
            <FormField label="Buscar produto" style={{ marginBottom: 0, minWidth: 220 }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar produto..."
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </FormField>
          )}
        </div>

        <Button onClick={openAddModal} disabled={!feiraId}>
          <Plus size={16} /> Adicionar item à carga
        </Button>
      </div>

      <FairGiftIndicators feiraId={feiraId} />

      {feiraId && (
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
          padding: 20, marginBottom: 24,
        }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
            Kits desta feira
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
            Define quais kits aparecem para entrega nesta feira. Não afeta a carga física — saldo continua sendo controlado abaixo.
          </p>

          {hasNoFairKits && !kitsLoading && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e',
              padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500,
            }}>
              Nenhum kit foi configurado para esta feira. Selecione ao menos um kit antes de operar entregas.
            </div>
          )}

          {kitsError && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c',
              padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500,
            }}>
              {kitsError}
            </div>
          )}

          {kitsLoading ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Carregando kits...</p>
          ) : allKits.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Nenhum kit ativo cadastrado.</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {allKits.map((kit) => (
                  <label key={kit.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#0f172a', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedKitIds.includes(kit.id)}
                      onChange={() => toggleKitSelection(kit.id)}
                    />
                    {kit.nome}
                  </label>
                ))}
              </div>

              <Button
                onClick={handleSaveFairKits}
                loading={savingKits}
                disabled={savingKits || !kitSelectionChanged}
              >
                Salvar kits da feira
              </Button>
            </>
          )}
        </div>
      )}

      {!feiraId ? (
        <div style={{
          textAlign: 'center', padding: '64px 32px',
          background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0',
        }}>
          <PackageOpen size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Selecione uma feira para ver ou preparar a carga de brindes.
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Produto</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Enviado</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Entregue</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Perda</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Retorno</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Saldo</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Observações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Carregando carga da feira...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum item enviado para esta feira ainda.</td></tr>
                ) : filteredRows.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum produto encontrado para "{search.trim()}".</td></tr>
                ) : (
                  filteredRows.map((row) => {
                    const saldo = computeSaldo(row)
                    const entregue = row.quantidade_entregue || 0
                    const isExpanded = expandedRowId === row.id
                    const rowOrigins = origins[row.brinde_id] || []
                    const detailTotal = rowOrigins.reduce((sum, o) => sum + o.quantidade, 0)
                    const hasMismatch = entregue > 0 && detailTotal !== entregue

                    return (
                      <React.Fragment key={row.id}>
                        <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontSize: 14, color: '#0f172a', fontWeight: 500 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <GiftThumbnail src={row.brindes?.imagem_url} alt={row.brindes?.nome} size={32} />
                              {row.brindes?.nome || 'removido'}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>{row.quantidade_enviada}</td>
                          <td style={{ padding: '12px 16px', fontSize: 15, color: '#0f172a', fontWeight: 700 }}>
                            {entregue}
                            {entregue > 0 && (
                              <button
                                onClick={() => setExpandedRowId(isExpanded ? null : row.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 2, marginTop: 2,
                                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                  fontSize: 11, fontWeight: 600, color: '#1B3A6B',
                                }}
                              >
                                {isExpanded ? 'Ocultar origem' : 'Ver origem'}
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>{row.quantidade_perda}</td>
                          <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>{row.quantidade_retorno}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <Badge color={saldo > 0 ? '#059669' : '#dc2626'} bg={saldo > 0 ? '#ecfdf5' : '#fef2f2'}>
                              {saldo}
                            </Badge>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{row.observacoes || '-'}</td>
                        </tr>
                        {isExpanded && (
                          <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                            <td colSpan={7} style={{ padding: '4px 16px 16px 58px' }}>
                              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Origem das unidades entregues
                              </p>
                              {originsError ? (
                                <p style={{ margin: 0, fontSize: 13, color: '#dc2626' }}>
                                  Não foi possível carregar o detalhamento de origem.
                                </p>
                              ) : (
                                <>
                                  {rowOrigins.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 320 }}>
                                      {rowOrigins.map((o) => (
                                        <div key={o.origem} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                                          <span>{o.origem}</span>
                                          <span style={{ fontWeight: 600 }}>{o.quantidade}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {hasMismatch && (
                                    <p style={{ margin: rowOrigins.length > 0 ? '8px 0 0' : 0, fontSize: 12, color: '#dc2626' }}>
                                      Detalhamento não confere com o total entregue. Detalhado: {detailTotal} · Entregue: {entregue}
                                    </p>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isAdding} onClose={() => !saving && setIsAdding(false)} title="Adicionar item à carga" width={480}>
        <form onSubmit={handleAddSubmit}>
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c',
              padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <FormField label="Brinde" required>
            <Select value={addForm.brinde_id} onChange={handleAddChange('brinde_id')}>
              <option value="">Selecione um brinde</option>
              {gifts.map((g) => (
                <option key={g.id} value={g.id}>{g.nome} (estoque central: {g.estoque_atual})</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Quantidade enviada" required>
            <Input type="number" min="1" step="1" value={addForm.quantidade} onChange={handleAddChange('quantidade')} placeholder="0" />
          </FormField>

          <FormField label="Observações">
            <Textarea value={addForm.observacoes} onChange={handleAddChange('observacoes')} placeholder="Observações adicionais" />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setIsAdding(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving} disabled={saving}>
              Enviar para a feira
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

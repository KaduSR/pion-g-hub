import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Minus } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import { FormField, Input, Textarea, Select, Button } from '../../../shared/components/FormField'
import { giftsService } from '../services/giftsService'
import { giftKitsService } from '../services/giftKitsService'
import { giftDeliveriesService } from '../services/giftDeliveriesService'
import { fairKitsService, filterKitsForFair } from '../services/fairKitsService'
import { fairGiftStockService, computeSaldo } from '../services/fairGiftStockService'
import { fairsService } from '../../fairs/services/fairsService'
import { leadsService } from '../../fairs/services/leadsService'

const emptyItemRow = () => ({ brinde_id: '', quantidade: '' })

/**
 * Entrega de brinde vinculada a feira + lead (Sprint 3.7). Único fluxo que
 * chama a RPC registrar_entrega_brinde_feira — sempre autenticado, sempre
 * com feira e lead, já finaliza como "entregue" (sem etapa de confirmação
 * separada) e valida saldo da feira no servidor. `initialFeiraId`/
 * `initialLeadId`/`fromKiosk` vêm do deep link `/brindes?tab=entregas&
 * leadId=...&feiraId=...&source=kiosk` iniciado no botão "Liberar Brinde"
 * do autoatendimento — a liberação em si só acontece aqui dentro, nunca na
 * rota pública.
 */
export function FairGiftDeliveryModal({ isOpen, onClose, onDelivered, initialFeiraId, initialLeadId, fromKiosk }) {
  const [fairs, setFairs] = useState([])
  const [leads, setLeads] = useState([])
  const [kits, setKits] = useState([])
  const [associatedKitIds, setAssociatedKitIds] = useState([])
  const [gifts, setGifts] = useState([])
  const [saldoRows, setSaldoRows] = useState([])

  const [feiraId, setFeiraId] = useState('')
  const [leadId, setLeadId] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState('kit')
  const [kitId, setKitId] = useState('')
  const [kitQuantidade, setKitQuantidade] = useState(1)
  const [itens, setItens] = useState([emptyItemRow()])
  const [observacoes, setObservacoes] = useState('')

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setFeiraId(initialFeiraId || '')
    setLeadId(initialLeadId || '')
    setTipoEntrega('kit')
    setKitId('')
    setKitQuantidade(1)
    setItens([emptyItemRow()])
    setObservacoes('')
    setError('')
    fairsService.getActive().then(setFairs).catch(() => setFairs([]))
    giftKitsService.getAll({ ativo: true })
      .then((data) => setKits(data.filter((k) => (k.brinde_kit_itens || []).length > 0)))
      .catch(() => setKits([]))
    giftsService.getActive().then(setGifts).catch(() => setGifts([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialFeiraId, initialLeadId])

  useEffect(() => {
    if (!feiraId) { setLeads([]); setSaldoRows([]); setAssociatedKitIds([]); return }
    leadsService.getByFair(feiraId).then(setLeads).catch(() => setLeads([]))
    fairGiftStockService.getByFair(feiraId).then(setSaldoRows).catch(() => setSaldoRows([]))
    fairKitsService.getByFair(feiraId).then(setAssociatedKitIds).catch(() => setAssociatedKitIds([]))
  }, [feiraId])

  const saldoByBrinde = useMemo(() => {
    const map = {}
    saldoRows.forEach((row) => { map[row.brinde_id] = computeSaldo(row) })
    return map
  }, [saldoRows])

  // P2: catálogo de kits restrito à feira selecionada (fonte canônica em
  // fairKitsService — 0 associações = nenhum kit disponível para entrega,
  // feira precisa ser configurada com >=1 kit antes de operar).
  const visibleKits = useMemo(() => filterKitsForFair(kits, associatedKitIds), [kits, associatedKitIds])

  const selectedKit = visibleKits.find((k) => k.id === kitId)

  // Disponibilidade real do kit na carga da feira: menor quantidade de
  // kits montáveis entre os componentes (limitado pelo componente com
  // menor saldo). Componente ausente da carga ou quantidade <= 0 na
  // composição contam como saldo 0 (kit indisponível), nunca Infinity/NaN.
  const kitsDisponiveis = useMemo(() => {
    const componentes = selectedKit?.brinde_kit_itens || []
    if (componentes.length === 0) return null
    let min = Infinity
    for (const item of componentes) {
      if (!item.quantidade || item.quantidade <= 0) return 0
      const saldo = Math.max(0, saldoByBrinde[item.brinde_id] ?? 0)
      const possiveis = Math.floor(saldo / item.quantidade)
      if (possiveis < min) min = possiveis
    }
    return Number.isFinite(min) ? min : 0
  }, [selectedKit, saldoByBrinde])

  // Kit trocado: quantidade sempre volta para 1 — nunca herda a seleção do
  // kit anterior, mesmo que a disponibilidade coincida por acaso.
  useEffect(() => { setKitQuantidade(1) }, [kitId])

  const handleAddItemRow = () => setItens((prev) => [...prev, emptyItemRow()])
  const handleRemoveItemRow = (index) => setItens((prev) => prev.filter((_, i) => i !== index))
  const handleItemChange = (index, field) => (e) => {
    const value = e.target.value
    setItens((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return

    if (!feiraId) { setError('Selecione a feira.'); return }
    if (!leadId) { setError('Selecione o lead.'); return }

    if (tipoEntrega === 'kit') {
      if (!kitId) { setError('Selecione um kit.'); return }
      if (!kitQuantidade || kitQuantidade < 1) { setError('Informe uma quantidade de kits maior que zero.'); return }
      if (kitsDisponiveis !== null && kitQuantidade > kitsDisponiveis) {
        setError(`Quantidade acima do disponível na feira (${kitsDisponiveis}).`)
        return
      }
    } else {
      const validItems = itens.filter((it) => it.brinde_id && Number(it.quantidade) > 0)
      if (validItems.length === 0) { setError('Adicione ao menos um item com quantidade maior que zero.'); return }
      const overStock = validItems.find((it) => Number(it.quantidade) > (saldoByBrinde[it.brinde_id] ?? 0))
      if (overStock) {
        setError(`Quantidade acima do saldo na feira (${saldoByBrinde[overStock.brinde_id] ?? 0}) para um dos itens.`)
        return
      }
    }

    setError('')
    setSaving(true)
    try {
      const result = await giftDeliveriesService.deliverAtFair({
        feiraId,
        leadId,
        tipoEntrega,
        kitId: tipoEntrega === 'kit' ? kitId : null,
        quantidadeKits: tipoEntrega === 'kit' ? kitQuantidade : 1,
        itens: tipoEntrega === 'item_avulso'
          ? itens.filter((it) => it.brinde_id && Number(it.quantidade) > 0).map((it) => ({ brindeId: it.brinde_id, quantidade: Number(it.quantidade) }))
          : null,
        observacoes: observacoes.trim(),
        origem: fromKiosk ? 'kiosk' : 'interno',
      })
      onDelivered?.(result)
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao liberar brinde.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Entregar Brinde na Feira" width={680}>
      <form onSubmit={handleSubmit}>
        {fromKiosk && (
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a',
            padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500,
          }}>
            Entrega iniciada a partir do autoatendimento. Confirme o kit ou os itens antes de liberar.
          </div>
        )}

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c',
            padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormField label="Feira" required>
            <Select value={feiraId} onChange={(e) => { setFeiraId(e.target.value); setLeadId(''); setKitId('') }} disabled={!!initialFeiraId}>
              <option value="">Selecione a feira</option>
              {fairs.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Lead" required>
            <Select value={leadId} onChange={(e) => setLeadId(e.target.value)} disabled={!feiraId || !!initialLeadId}>
              <option value="">Selecione o lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.nome} {l.empresa ? `— ${l.empresa}` : ''}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Tipo de entrega" required style={{ gridColumn: '1 / -1' }}>
            <Select value={tipoEntrega} onChange={(e) => setTipoEntrega(e.target.value)}>
              <option value="kit">Kit</option>
              <option value="item_avulso">Item avulso</option>
            </Select>
          </FormField>

          {tipoEntrega === 'kit' ? (
            <FormField label="Kit" required style={{ gridColumn: '1 / -1' }}>
              {feiraId && visibleKits.length === 0 ? (
                <div style={{
                  background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e',
                  padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 500,
                }}>
                  Nenhum kit configurado para esta feira.
                </div>
              ) : (
                <Select value={kitId} onChange={(e) => setKitId(e.target.value)}>
                  <option value="">Selecione um kit</option>
                  {visibleKits.map((k) => (
                    <option key={k.id} value={k.id}>{k.nome}</option>
                  ))}
                </Select>
              )}
              {selectedKit && (
                <>
                  <div style={{
                    marginTop: 8, fontSize: 13, fontWeight: 600,
                    color: kitsDisponiveis > 0 ? '#059669' : '#dc2626',
                  }}>
                    {kitsDisponiveis > 0
                      ? `${kitsDisponiveis} kits disponíveis`
                      : 'Kit indisponível'}
                  </div>

                  {kitsDisponiveis > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                      <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Quantidade</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                        <button
                          type="button"
                          onClick={() => setKitQuantidade((q) => Math.max(1, q - 1))}
                          disabled={kitQuantidade <= 1}
                          style={{
                            width: 32, height: 32, borderRadius: '8px 0 0 8px', border: '1px solid #cbd5e1',
                            background: kitQuantidade <= 1 ? '#f1f5f9' : '#fff', cursor: kitQuantidade <= 1 ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Minus size={14} />
                        </button>
                        <div style={{
                          width: 44, height: 32, border: '1px solid #cbd5e1', borderLeft: 'none', borderRight: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#0f172a',
                        }}>
                          {kitQuantidade}
                        </div>
                        <button
                          type="button"
                          onClick={() => setKitQuantidade((q) => Math.min(kitsDisponiveis, q + 1))}
                          disabled={kitQuantidade >= kitsDisponiveis}
                          style={{
                            width: 32, height: 32, borderRadius: '0 8px 8px 0', border: '1px solid #cbd5e1',
                            background: kitQuantidade >= kitsDisponiveis ? '#f1f5f9' : '#fff', cursor: kitQuantidade >= kitsDisponiveis ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 12, color: '#64748b' }}>
                    {(selectedKit.brinde_kit_itens || []).map((item) => {
                      const saldo = saldoByBrinde[item.brinde_id] ?? 0
                      const necessario = item.quantidade * kitQuantidade
                      return (
                        <li key={item.id} style={{ color: saldo < necessario ? '#dc2626' : '#64748b' }}>
                          {necessario}x {item.brindes?.nome} — saldo na feira: {saldo}
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </FormField>
          ) : (
            <div style={{ gridColumn: '1 / -1' }}>
              {itens.map((row, index) => (
                <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
                  <FormField label={index === 0 ? 'Brinde' : undefined} style={{ marginBottom: 0, flex: 2 }}>
                    <Select value={row.brinde_id} onChange={handleItemChange(index, 'brinde_id')}>
                      <option value="">Selecione um brinde</option>
                      {gifts.map((g) => (
                        <option key={g.id} value={g.id}>{g.nome} (saldo na feira: {saldoByBrinde[g.id] ?? 0})</option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label={index === 0 ? 'Qtd.' : undefined} style={{ marginBottom: 0, width: 90 }}>
                    <Input
                      type="number" min="1" step="1"
                      max={row.brinde_id ? (saldoByBrinde[row.brinde_id] ?? undefined) : undefined}
                      value={row.quantidade} onChange={handleItemChange(index, 'quantidade')} placeholder="0"
                    />
                  </FormField>
                  <Button
                    type="button" variant="secondary" size="sm"
                    onClick={() => handleRemoveItemRow(index)}
                    disabled={itens.length === 1}
                    style={{ marginBottom: 0 }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={handleAddItemRow}>
                <Plus size={14} /> Adicionar item
              </Button>
            </div>
          )}

          <FormField label="Observações" style={{ gridColumn: '1 / -1' }}>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações adicionais" />
          </FormField>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} disabled={saving}>
            Confirmar entrega
          </Button>
        </div>
      </form>
    </Modal>
  )
}

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, CheckCircle, XCircle, Gift } from 'lucide-react'
import { giftDeliveriesService } from '../services/giftDeliveriesService'
import { DeliveryModal } from './DeliveryModal'
import { FairGiftDeliveryModal } from './FairGiftDeliveryModal'
import { useProfileContext } from '../../profiles/contexts/ProfileContext'
import { Button } from '../../../shared/components/FormField'
import { Badge } from '../../../shared/components/Badge'
import { formatDateTime } from '../../../shared/utils/helpers'
import { formatContexto } from '../constants/giftConstants'

const STATUS_COLORS = {
  liberado: { color: '#d97706', bg: '#fffbeb', label: 'Liberado' },
  entregue: { color: '#059669', bg: '#ecfdf5', label: 'Entregue' },
  cancelado: { color: '#dc2626', bg: '#fef2f2', label: 'Cancelado' },
}

export function DeliveriesListTab({ showToast }) {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const { profile } = useProfileContext()
  const [searchParams, setSearchParams] = useSearchParams()

  // Entrega vinculada a feira (Sprint 3.7): null | { feiraId, leadId, fromKiosk }
  const [fairDelivery, setFairDelivery] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await giftDeliveriesService.getAll()
      setDeliveries(data)
    } catch (err) {
      showToast('Erro ao carregar entregas.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Deep link do autoatendimento: /brindes?tab=entregas&leadId=...&feiraId=...&source=kiosk
  // (botão "Liberar Brinde" da tela pública). Abre o modal interno já
  // pré-preenchido, mas NUNCA libera nada sozinho — quem confirma é sempre
  // o atendente logado. Consome os params uma única vez (não reabre num
  // refresh da página).
  useEffect(() => {
    const leadId = searchParams.get('leadId')
    const feiraId = searchParams.get('feiraId')
    if (leadId && feiraId) {
      setFairDelivery({ feiraId, leadId, fromKiosk: searchParams.get('source') === 'kiosk' })
      setSearchParams({ tab: 'entregas' }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (payload) => {
    const created = await giftDeliveriesService.create({ ...payload, createdBy: profile?.id })
    showToast(`Entrega liberada! Comprovante: ${created.codigo_comprovante}`)
    load()
  }

  const handleFairDelivered = (result) => {
    showToast(`Brinde entregue! Comprovante: ${result?.entrega?.codigo_comprovante || '-'}`)
    load()
  }

  const handleConfirm = async (delivery) => {
    setBusyId(delivery.id)
    try {
      await giftDeliveriesService.confirm(delivery.id, profile?.id)
      showToast('Entrega confirmada e estoque atualizado!')
      load()
    } catch (err) {
      showToast(err.message || 'Erro ao confirmar entrega.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleCancel = async (delivery) => {
    setBusyId(delivery.id)
    try {
      await giftDeliveriesService.cancel(delivery.id)
      showToast('Entrega cancelada.')
      load()
    } catch (err) {
      showToast(err.message || 'Erro ao cancelar entrega.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 16 }}>
        <Button variant="secondary" onClick={() => setFairDelivery({ feiraId: '', leadId: '', fromKiosk: false })}>
          <Gift size={16} /> Entregar na feira
        </Button>
        <Button onClick={() => setIsCreating(true)}>
          <Plus size={16} /> Nova entrega
        </Button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Comprovante</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Item</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Destinatário</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Contexto</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Liberado por</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Carregando entregas...</td></tr>
              ) : deliveries.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhuma entrega registrada.</td></tr>
              ) : (
                deliveries.map((d) => {
                  const statusInfo = STATUS_COLORS[d.status] || { color: '#64748b', bg: '#f1f5f9', label: d.status }
                  let itemLabel
                  if (d.tipo_entrega === 'kit') {
                    itemLabel = `Kit: ${d.brinde_kits?.nome || 'removido'}`
                  } else if (d.brinde_id) {
                    itemLabel = `${d.quantidade}x ${d.brindes?.nome || 'removido'}`
                  } else if (d.brinde_entrega_itens?.length > 0) {
                    itemLabel = d.brinde_entrega_itens.map((it) => `${it.quantidade}x ${it.brindes?.nome || 'removido'}`).join(', ')
                  } else {
                    itemLabel = '-'
                  }

                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace', color: '#0f172a' }}>{d.codigo_comprovante}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>{itemLabel}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                        {d.destinatario_nome || d.leads_feira?.nome || '-'}
                        {d.destinatario_empresa || d.leads_feira?.empresa ? ` — ${d.destinatario_empresa || d.leads_feira?.empresa}` : ''}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                        {formatContexto(d.contexto_tipo)}{d.feiras?.nome ? ` — ${d.feiras.nome}` : ''}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                        {d.entregue_por?.nome || '-'}
                        {d.origem === 'kiosk' && (
                          <Badge color="#1e3a8a" bg="#eff6ff" style={{ marginLeft: 6 }}>autoatendimento</Badge>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge color={statusInfo.color} bg={statusInfo.bg}>{statusInfo.label}</Badge>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {d.status === 'liberado' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button variant="success" size="sm" onClick={() => handleConfirm(d)} disabled={busyId === d.id}>
                              <CheckCircle size={14} /> Confirmar
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleCancel(d)} disabled={busyId === d.id}>
                              <XCircle size={14} /> Cancelar
                            </Button>
                          </div>
                        )}
                        {d.status !== 'liberado' && (
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>
                            {d.entregue_em ? formatDateTime(d.entregue_em) : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeliveryModal isOpen={isCreating} onClose={() => setIsCreating(false)} onSave={handleSave} />

      <FairGiftDeliveryModal
        isOpen={!!fairDelivery}
        onClose={() => setFairDelivery(null)}
        onDelivered={handleFairDelivered}
        initialFeiraId={fairDelivery?.feiraId}
        initialLeadId={fairDelivery?.leadId}
        fromKiosk={fairDelivery?.fromKiosk}
      />
    </div>
  )
}

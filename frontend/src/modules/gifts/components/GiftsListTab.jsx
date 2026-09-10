import React, { useState, useEffect } from 'react'
import { Plus, Edit2, AlertTriangle } from 'lucide-react'
import { giftsService } from '../services/giftsService'
import { giftMovementsService } from '../services/giftMovementsService'
import { GiftModal } from './GiftModal'
import { GiftThumbnail } from './GiftThumbnail'
import { useProfileContext } from '../../profiles/contexts/ProfileContext'
import { Button } from '../../../shared/components/FormField'
import { Badge } from '../../../shared/components/Badge'
import { formatCurrency } from '../../../shared/utils/helpers'

export function GiftsListTab({ showToast }) {
  const [gifts, setGifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingGift, setEditingGift] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const { profile } = useProfileContext()

  const load = async () => {
    setLoading(true)
    try {
      const data = await giftsService.getAll()
      setGifts(data)
    } catch (err) {
      showToast('Erro ao carregar brindes.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (payload, giftId) => {
    if (giftId) {
      await giftsService.update(giftId, payload)
      showToast('Brinde atualizado com sucesso!')
    } else {
      const created = await giftsService.create(payload)
      if (payload.estoque_inicial > 0) {
        await giftMovementsService.create({
          brindeId: created.id,
          tipo: 'entrada',
          quantidade: payload.estoque_inicial,
          motivo: 'Estoque inicial',
          contextoTipo: 'ajuste_estoque',
          contextoDescricao: 'Cadastro do brinde',
          createdBy: profile?.id,
          responsavelProfileId: profile?.id,
        })
      }
      showToast('Brinde cadastrado com sucesso!')
    }
    load()
  }

  const handleToggleActive = async (gift) => {
    try {
      await giftsService.toggleActive(gift.id, !gift.ativo)
      showToast(`Brinde ${!gift.ativo ? 'ativado' : 'desativado'} com sucesso!`)
      load()
    } catch (err) {
      showToast(err.message || 'Erro ao alterar status.', 'error')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button onClick={() => setIsCreating(true)}>
          <Plus size={16} /> Novo brinde
        </Button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Brinde</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Valor Unit.</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Estoque</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Carregando brindes...</td></tr>
              ) : gifts.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum brinde cadastrado.</td></tr>
              ) : (
                gifts.map((g) => {
                  const estoqueBaixo = g.estoque_atual <= g.estoque_minimo
                  return (
                    <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <GiftThumbnail src={g.imagem_url} alt={g.nome} size={48} />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{g.nome}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>{g.categoria || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>{formatCurrency(g.valor_unitario)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: estoqueBaixo ? '#dc2626' : '#0f172a' }}>
                            {g.estoque_atual}
                          </span>
                          {estoqueBaixo && (
                            <span title={`Abaixo do mínimo (${g.estoque_minimo})`}>
                              <AlertTriangle size={14} color="#dc2626" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge color={g.ativo ? '#059669' : '#dc2626'} bg={g.ativo ? '#ecfdf5' : '#fef2f2'}>
                          {g.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button variant="secondary" size="sm" onClick={() => setEditingGift(g)}>
                            <Edit2 size={14} /> Editar
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => handleToggleActive(g)}>
                            {g.ativo ? 'Desativar' : 'Ativar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <GiftModal isOpen={isCreating} onClose={() => setIsCreating(false)} gift={null} onSave={handleSave} />
      <GiftModal isOpen={!!editingGift} onClose={() => setEditingGift(null)} gift={editingGift} onSave={handleSave} />
    </div>
  )
}

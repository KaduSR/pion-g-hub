import React, { useState, useEffect } from 'react'
import { Plus, Edit2 } from 'lucide-react'
import { giftKitsService } from '../services/giftKitsService'
import { KitModal } from './KitModal'
import { GiftThumbnail } from './GiftThumbnail'
import { Button } from '../../../shared/components/FormField'
import { Badge } from '../../../shared/components/Badge'

export function KitsListTab({ showToast }) {
  const [kits, setKits] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingKit, setEditingKit] = useState(null)
  const [isCreating, setIsCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await giftKitsService.getAll()
      setKits(data)
    } catch (err) {
      showToast('Erro ao carregar kits.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (payload, items, kitId) => {
    const savedKit = kitId
      ? await giftKitsService.update(kitId, payload)
      : await giftKitsService.create(payload)

    await giftKitsService.saveItems(savedKit.id, items)
    showToast(kitId ? 'Kit atualizado com sucesso!' : 'Kit cadastrado com sucesso!')
    load()
  }

  const handleToggleActive = async (kit) => {
    try {
      await giftKitsService.toggleActive(kit.id, !kit.ativo)
      showToast(`Kit ${!kit.ativo ? 'ativado' : 'desativado'} com sucesso!`)
      load()
    } catch (err) {
      showToast(err.message || 'Erro ao alterar status do kit.', 'error')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button onClick={() => setIsCreating(true)}>
          <Plus size={16} /> Novo kit
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>Carregando kits...</div>
      ) : kits.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          Nenhum kit cadastrado.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {kits.map((kit) => (
            <div key={kit.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
                  {kit.nome}
                </h3>
                <Badge color={kit.ativo ? '#059669' : '#dc2626'} bg={kit.ativo ? '#ecfdf5' : '#fef2f2'}>
                  {kit.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              {kit.descricao && (
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>{kit.descricao}</p>
              )}

              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(kit.brinde_kit_itens || []).map((item) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
                    <GiftThumbnail src={item.brindes?.imagem_url} size={40} />
                    {item.brindes?.nome || 'Brinde removido'} x{item.quantidade}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => setEditingKit(kit)}>
                  <Edit2 size={14} /> Editar
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleToggleActive(kit)}>
                  {kit.ativo ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <KitModal isOpen={isCreating} onClose={() => setIsCreating(false)} kit={null} onSave={handleSave} />
      <KitModal isOpen={!!editingKit} onClose={() => setEditingKit(null)} kit={editingKit} onSave={handleSave} />
    </div>
  )
}

import React, { useState } from 'react'
import { Plus, Pencil, Trash2, CalendarDays, MapPin, User, Eye, Tablet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useFairs } from '../hooks/useFairs'
import { useFairsContext } from '../contexts/FairsContext'
import { fairsService } from '../services/fairsService'
import { FairForm } from '../components/FairForm'
import { Modal } from '../../../shared/components/Modal'
import { Badge } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/FormField'
import { useToast } from '../../../shared/components/Toast'
import { formatDate } from '../../../shared/utils/helpers'
import { FAIR_STATUS_CONFIG } from '../../../shared/utils/constants'

export function FairsPage() {
  const { fairs, loading, error, createFair, updateFair, removeFair } = useFairs()
  const { refreshFairs } = useFairsContext()
  const navigate = useNavigate()
  const { show: showToast, ToastEl } = useToast()

  const [modal, setModal]       = useState(null) // null | 'create' | { fair }
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)

  const handleCreate = async (form) => {
    setSaving(true)
    try {
      const { equipe, ...payload } = form
      const newFair = await createFair(payload)
      if (equipe) {
        await fairsService.saveFairTeam(newFair.id, equipe)
      }
      await refreshFairs()
      showToast('Feira criada com sucesso!')
      setModal(null)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (form) => {
    setSaving(true)
    try {
      const { equipe, ...payload } = form
      await updateFair(modal.fair.id, payload)
      if (equipe) {
        await fairsService.saveFairTeam(modal.fair.id, equipe)
      }
      await refreshFairs()
      showToast('Feira atualizada com sucesso!')
      setModal(null)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Link do Autoatendimento INTERNO (/atendimento/:feiraId — autenticado,
  // AutoServicePage): a feira já vem pré-selecionada, mas o colaborador
  // precisa estar logado no tablet do estande. Não confundir com o kiosk
  // público antigo (/autoatendimento/:feiraId, sem login) — esse continua
  // existindo, só não é mais o que este botão copia.
  const handleCopyKioskLink = async (fair) => {
    const url = `${window.location.origin}/atendimento/${fair.id}`
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link do autoatendimento interno copiado!')
    } catch (_) {
      showToast(`Não foi possível copiar automaticamente. Link: ${url}`, 'error')
    }
  }

  const handleDelete = async (fair) => {
    if (!confirm(`Excluir a feira "${fair.nome}"? Todos os leads serão removidos.`)) return
    setDeleting(fair.id)
    try {
      await removeFair(fair.id)
      await refreshFairs()
      showToast('Feira removida.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
      {ToastEl}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
            Feiras
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Gerencie todas as feiras e eventos
          </p>
        </div>
        <Button onClick={() => setModal('create')} size="md">
          <Plus size={16} /> Nova Feira
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 16, marginBottom: 20, color: '#dc2626', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 64, color: '#94a3b8' }}>
          <div className="spinner" />
          <p>Carregando feiras…</p>
        </div>
      )}

      {/* Empty */}
      {!loading && fairs.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '80px 32px',
          background: '#f8fafc', borderRadius: 16,
          border: '2px dashed #e2e8f0',
        }}>
          <CalendarDays size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
          <h3 style={{ color: '#64748b', fontWeight: 600, margin: '0 0 8px' }}>Nenhuma feira cadastrada</h3>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>Crie a primeira feira para começar a captar leads.</p>
          <Button onClick={() => setModal('create')}>
            <Plus size={16} /> Criar primeira feira
          </Button>
        </div>
      )}

      {/* Grid */}
      {!loading && fairs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {fairs.map((fair) => {
            const cfg = FAIR_STATUS_CONFIG[fair.status] || FAIR_STATUS_CONFIG['Planejada']
            return (
              <div key={fair.id} style={{
                background: '#fff',
                borderRadius: 14,
                border: '1px solid #f1f5f9',
                padding: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.15s',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {fair.nome}
                  </h3>
                  <Badge color={cfg.color} bg={cfg.bg}>{fair.status}</Badge>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13 }}>
                    <MapPin size={14} />
                    <span>{fair.cidade} — {fair.estado}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13 }}>
                    <CalendarDays size={14} />
                    <span>{formatDate(fair.data_inicio)} a {formatDate(fair.data_fim)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13 }}>
                    <User size={14} />
                    <span>{fair.responsavel}</span>
                  </div>
                </div>

                {fair.observacoes && (
                  <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.5 }}>
                    {fair.observacoes}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <Button
                    variant="secondary" size="sm"
                    onClick={() => navigate(`/leads?feira=${fair.id}`)}
                    style={{ flex: 1 }}
                  >
                    <Eye size={14} /> Ver leads
                  </Button>
                  <Button
                    variant="secondary" size="sm"
                    onClick={() => handleCopyKioskLink(fair)}
                    title="Copiar link do autoatendimento interno (tablet do estande, requer login)"
                  >
                    <Tablet size={14} />
                  </Button>
                  <Button
                    variant="secondary" size="sm"
                    onClick={() => setModal({ fair })}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="danger" size="sm"
                    loading={deleting === fair.id}
                    onClick={() => handleDelete(fair)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={modal === 'create'}
        onClose={() => setModal(null)}
        title="Nova Feira"
        width={620}
      >
        <FairForm onSubmit={handleCreate} onCancel={() => setModal(null)} loading={saving} />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!modal?.fair}
        onClose={() => setModal(null)}
        title="Editar Feira"
        width={620}
      >
        {modal?.fair && (
          <FairForm
            initial={modal.fair}
            onSubmit={handleUpdate}
            onCancel={() => setModal(null)}
            loading={saving}
          />
        )}
      </Modal>

      <style>{`
        .spinner {
          width: 32px; height: 32px; border: 3px solid #e2e8f0;
          border-top-color: #4f46e5; border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin: 0 auto 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

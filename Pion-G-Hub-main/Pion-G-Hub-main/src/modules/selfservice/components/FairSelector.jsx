import React from 'react'
import { CalendarDays, MapPin, ChevronRight } from 'lucide-react'

/**
 * Se o perfil estiver associado a feiras via feira_equipe, prioriza mostrar
 * só essas — mesmo filtro já usado em LeadCapturePage.jsx. admin/gestor/
 * marketing sempre veem todas. Não é bloqueante: se `feira_equipe` ainda
 * não estiver preenchida para alguém, a lista cai para "todas as feiras
 * ativas" em vez de ficar vazia (ver `hasTeamFilter` abaixo).
 */
export function FairSelector({ fairs, loading, profile, onSelect }) {
  const isManager = !profile || ['admin', 'gestor', 'marketing'].includes(profile.role)
  const teamFairs = isManager ? fairs : fairs.filter((f) => f.feira_equipe?.some((e) => e.profile_id === profile.id))
  const visibleFairs = teamFairs.length > 0 ? teamFairs : fairs

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
        Selecione a feira
      </h2>
      <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: 14 }}>
        É preciso escolher uma feira antes de iniciar qualquer atendimento.
      </p>

      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>Carregando feiras…</div>
      )}

      {!loading && visibleFairs.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 24px', background: '#f8fafc',
          borderRadius: 16, border: '2px dashed #e2e8f0',
        }}>
          <CalendarDays size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p style={{ color: '#64748b', fontWeight: 600, margin: 0 }}>Nenhuma feira ativa no momento</p>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>Fale com o administrador para ativar uma feira.</p>
        </div>
      )}

      {!loading && visibleFairs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visibleFairs.map((fair) => (
            <button
              key={fair.id}
              onClick={() => onSelect(fair.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                width: '100%', textAlign: 'left', background: '#fff',
                border: '1.5px solid #e2e8f0', borderRadius: 16,
                padding: '18px 20px', cursor: 'pointer', minHeight: 76,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
                  {fair.nome}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, color: '#64748b', fontSize: 13 }}>
                  {(fair.cidade || fair.estado) && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={13} /> {fair.cidade}{fair.cidade && fair.estado ? ' — ' : ''}{fair.estado}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CalendarDays size={13} /> {fair.status}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} color="#94a3b8" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

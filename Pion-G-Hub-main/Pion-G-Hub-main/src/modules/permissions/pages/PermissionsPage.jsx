import { useState } from 'react'
import { usePermissions } from '../contexts/PermissionsContext'
import { PERMISSIONS } from '../constants/permissions'
import { RolesTab } from '../components/RolesTab'
import { UsersTab } from '../components/UsersTab'
import { HistoryTab } from '../components/HistoryTab'

const TABS = [
  { id: 'perfis', label: 'Perfis de acesso' },
  { id: 'usuarios', label: 'Usuários' },
  { id: 'historico', label: 'Histórico', permission: PERMISSIONS.PERMISSIONS_AUDIT_VIEW },
]

/**
 * Sprint 3.8, Etapa 6 — Centro de Permissões: interface administrativa
 * conectada ao banco. Leitura pra quem tem `permissions.view`; gravação
 * (Etapa 6.2 — conceder/revogar permissões de papel, criar/remover
 * overrides individuais) só pra quem tem `permissions.manage`, sempre via
 * as 4 RPCs SECURITY DEFINER (nunca INSERT/UPDATE/DELETE direto — a RLS de
 * escrita nem existe mais nessas tabelas).
 *
 * Cache: cada Salvar bem-sucedido invalida o `permissionService.js` local
 * (desta aba do navegador) — o próprio admin logado vê o efeito na hora se
 * a mudança afetar ele mesmo. Outras pessoas com sessão aberta em OUTRAS
 * abas/dispositivos só veem a mudança depois de recarregar a página
 * (não há realtime nesta etapa — ver checkpoint).
 */
export function PermissionsPage() {
  const { can } = usePermissions()
  const [activeTab, setActiveTab] = useState('perfis')

  const visibleTabs = TABS.filter((tab) => !tab.permission || can(tab.permission))
  // Se a aba ativa não estiver mais visível (ex: perdeu permissions.audit_view
  // no meio da sessão), cai pra primeira aba visível em vez de ficar em branco.
  const currentTab = visibleTabs.some((t) => t.id === activeTab) ? activeTab : visibleTabs[0]?.id

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
          Centro de Permissões
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          Consulte e ajuste papéis, permissões individuais e o histórico de alterações.
        </p>
      </div>

      <div style={{
        display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #e2e8f0',
        overflowX: 'auto',
      }}>
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: currentTab === tab.id ? '2px solid #1B3A6B' : '2px solid transparent',
              background: 'transparent',
              color: currentTab === tab.id ? '#1B3A6B' : '#64748b',
              fontSize: 14,
              fontWeight: currentTab === tab.id ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {currentTab === 'perfis' && <RolesTab />}
      {currentTab === 'usuarios' && <UsersTab />}
      {currentTab === 'historico' && <HistoryTab />}
    </div>
  )
}

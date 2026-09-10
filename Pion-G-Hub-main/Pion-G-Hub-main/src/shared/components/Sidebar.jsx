import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Gift, Settings, Package, LifeBuoy, Home, Megaphone,
  ClipboardList, MessageSquarePlus, UserCircle, UserPlus, MonitorSmartphone, Users,
  BarChart3, ShieldCheck,
  ChevronDown, ChevronRight as ChevronRightSmall, ChevronLeft,
  PanelLeftClose, PanelLeftOpen,
  X, Menu, LogOut,
} from 'lucide-react'
import { useSettingsContext, DEFAULT_SETTINGS } from '../../modules/settings/contexts/SettingsContext'
import { useAuth } from '../../modules/auth/hooks/useAuth'
import { useProfileContext } from '../../modules/profiles/contexts/ProfileContext'
// Etapa 5: migrado do mapa estático (usePermissions em hooks/) para o
// contexto central (PermissionsProvider em App.jsx), que resolve via banco
// com cache/fallback — mesma API (can/canAny), import diferente.
import { usePermissions } from '../../modules/permissions/contexts/PermissionsContext'
import { PERMISSIONS } from '../../modules/permissions/constants/permissions'
import { useAreaNavigation } from '../../modules/hub/hooks/useAreaNavigation'

// Ícones dos itens de navegação — item.icon (quando o navigation item do
// moduleRegistry.js define um, ver Etapa 6.2) com fallback pra module.icon,
// resolvido por useAreaNavigation().
const ICONS = {
  LayoutDashboard, CalendarDays, Gift, Settings, LifeBuoy,
  ClipboardList, MessageSquarePlus, UserCircle, UserPlus, MonitorSmartphone, Users,
  BarChart3, ShieldCheck,
}

// Ícones das ÁREAS (areaRegistry.js) — conjunto próprio, independente dos
// ícones de módulo/item acima (mesmo padrão de AreaCard.jsx).
const AREA_ICONS = { Home, Megaphone, LifeBuoy, Settings }

// Ordena os acessos dentro de cada área pelo rótulo REALMENTE exibido ao
// usuário (Etapa 6.2 — ajuste de UX), não pelo item.label bruto do hook —
// necessário porque /leads exibe "Meus Leads" ou "Gestão de Leads"
// dependendo do perfil (ver resolveLabel). As ÁREAS em si nunca são
// reordenadas, só os navigationItems dentro de cada uma.
const PT_BR_COLLATOR = new Intl.Collator('pt-BR', {
  sensitivity: 'base',
  numeric: true,
})

// Divide "/brindes?tab=kits" (ou "/ti?view=central") em pathname + query
// params, pra comparar com a rota atual sem depender de parser de texto nem
// duplicar lógica de rota em vários lugares. Genérico por chave de query —
// não fica preso a "tab": Sprint 4.3 reaproveita o mesmo mecanismo com
// "view" (Central de Atendimento), sem precisar de um segundo helper.
function parsePath(rawPath) {
  if (!rawPath) return { pathname: null, query: null }
  const [pathname, queryString] = rawPath.split('?')
  return { pathname, query: queryString ? new URLSearchParams(queryString) : null }
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  // Acordeão por ÁREA na Sidebar expandida (Etapa 6.2 — feedback de UX):
  // só uma área aberta por vez; começa fechada (também em /areas) e só abre
  // sozinha quando a rota atual pertence a alguma área (ver useEffect mais
  // abaixo). Não controla o modo recolhido, que continua usando flyout.
  const [expandedAreaId, setExpandedAreaId] = useState(null)
  const toggleArea = (areaId) => {
    setExpandedAreaId((prev) => (prev === areaId ? null : areaId))
  }

  // Flyout de uma ÁREA quando a Sidebar está recolhida (ver seção "Botão
  // de recolher/expandir" mais abaixo): renderizado via portal em
  // document.body, pra escapar do overflow:hidden/auto do <nav> — um
  // position:absolute comum ficaria cortado pelo próprio container que
  // criamos pra eliminar a barra de rolagem horizontal.
  const [flyoutAreaId, setFlyoutAreaId] = useState(null)
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 })
  const flyoutCloseTimer = useRef(null)

  const openFlyout = (areaId, triggerEl) => {
    clearTimeout(flyoutCloseTimer.current)
    const rect = triggerEl.getBoundingClientRect()
    setFlyoutPos({ top: rect.top, left: rect.right + 8 })
    setFlyoutAreaId(areaId)
  }
  const scheduleCloseFlyout = () => {
    clearTimeout(flyoutCloseTimer.current)
    flyoutCloseTimer.current = setTimeout(() => setFlyoutAreaId(null), 150)
  }
  const cancelCloseFlyout = () => clearTimeout(flyoutCloseTimer.current)

  const location = useLocation()
  const navigate = useNavigate()

  // ── Configurações do sistema ─────────────────────────────────────────────
  const { settings } = useSettingsContext()
  const sysNome = settings?.nome_sistema || DEFAULT_SETTINGS.nome_sistema
  const sysSubtitulo = settings?.subtitulo || DEFAULT_SETTINGS.subtitulo
  const sysCor = settings?.cor_primaria || DEFAULT_SETTINGS.cor_primaria
  const sysLogo = settings?.logo_url || null

  // ── Usuário / Perfil ─────────────────────────────────────────────────────
  const { user, logout } = useAuth()
  const { profile } = useProfileContext()
  const { can } = usePermissions()
  const { areaNavigation, isLoading: areasLoading } = useAreaNavigation()

  // Label do submódulo de leads: vendedor (leads.view_own sem view_all/team) → "Meus Leads"
  const leadsLabel = (!can(PERMISSIONS.LEADS_VIEW_ALL) && !can(PERMISSIONS.LEADS_VIEW_TEAM))
    ? 'Meus Leads'
    : 'Gestão de Leads'

  const resolveLabel = (item) => (item.path === '/leads' ? leadsLabel : item.label)

  // Ordena os navigationItems de uma área pelo rótulo já resolvido
  // (resolveLabel) — cópia nova via [...], nunca muta area.navigationItems.
  // Usado tanto pelo acordeão expandido/mobile quanto pelo flyout recolhido,
  // sem duplicar a regra de ordenação nos dois blocos.
  const getSortedNavigationItems = (area) =>
    [...area.navigationItems].sort((itemA, itemB) =>
      PT_BR_COLLATOR.compare(resolveLabel(itemA), resolveLabel(itemB))
    )

  const isItemActive = (item) => {
    const { pathname, query } = parsePath(item.path)
    if (!pathname || pathname !== location.pathname) return false
    if (!query) return true
    const currentParams = new URLSearchParams(location.search)
    // Toda chave de query do item precisa bater com a URL atual — cobre
    // tanto "?tab=" (brindes) quanto "?view=" (Central de Atendimento de TI)
    // sem precisar saber qual nome de parâmetro cada módulo usa.
    for (const [key, value] of query.entries()) {
      if (currentParams.get(key) !== value) return false
    }
    return true
  }

  // Ícone recolhido (ou cabeçalho do acordeão expandido) acende quando
  // qualquer um dos navigationItems da área (já resolvidos/autorizados por
  // useAreaNavigation) está ativo.
  const isAreaActive = (area) => area.navigationItems.some(isItemActive)

  // Abre automaticamente a área dona da rota atual — tanto no primeiro
  // load (deep link direto pra uma rota operacional) quanto em navegações
  // subsequentes. Em /areas (ou qualquer rota que não pertença a nenhuma
  // área) nenhum item bate, então nada é aberto — mantendo a Central de
  // Áreas sempre com o acordeão fechado. Não interfere num toggle manual
  // enquanto o usuário permanecer na mesma rota. `areasLoading` entra nas
  // deps pra reavaliar quando a Central de Atendimento (carregada
  // assincronamente) resolve depois do primeiro load, sem exigir mudança
  // de rota.
  useEffect(() => {
    const active = areaNavigation.find((area) => area.navigationItems.some(isItemActive))
    if (active) setExpandedAreaId(active.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, areasLoading])

  // Mobile (drawer aberto) sempre usa o modo expandido/acordeão, mesmo que
  // o usuário tenha deixado a Sidebar recolhida no desktop — só quando o
  // drawer está fechado (ou estamos no desktop) é que `collapsed` decide
  // o modo ícone+flyout.
  const useCollapsedLayout = collapsed && !mobileOpen

  const displayName =
    profile?.nome ||
    profile?.email?.split('@')[0] ||
    user?.email?.split('@')[0] ||
    'Usuário'

  const displayEmail =
    profile?.email ||
    user?.email ||
    ''

  const avatarUrl = profile?.avatar_url || null

  // Faixas pedidas: expandida ~250–270px, recolhida ~72–80px. Sem
  // redimensionamento arrastável — só os dois estados fixos abaixo.
  const sidebarWidth = collapsed ? 76 : 260

  // Iniciais para o avatar fallback
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  // ── Sub-componentes ──────────────────────────────────────────────────────

  // Logo do sistema (topo da sidebar) — clicável, leva para a Central de
  // Áreas (Sprint 5.1).
  function SysLogo() {
    if (sysLogo) {
      return (
        <img
          src={sysLogo}
          alt={sysNome}
          style={{
            width: 34, height: 34, borderRadius: 9,
            objectFit: 'contain', background: '#1e293b', padding: 2,
          }}
        />
      )
    }
    return (
      <div style={{
        width: 34, height: 34, borderRadius: 9,
        background: sysCor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 17, color: '#fff',
        fontFamily: 'Space Grotesk, sans-serif',
        flexShrink: 0,
      }}>
        {sysNome[0]?.toUpperCase()}
      </div>
    )
  }

  // Avatar circular do usuário
  function UserAvatar({ size = 36 }) {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={displayName}
          style={{
            width: size, height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
            border: '2px solid rgba(255,255,255,0.12)',
            display: 'block',
          }}
        />
      )
    }
    return (
      <div style={{
        width: size, height: size,
        borderRadius: '50%',
        background: sysCor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.38), fontWeight: 700, color: '#fff',
        fontFamily: 'Space Grotesk, sans-serif',
        flexShrink: 0,
        border: '2px solid rgba(255,255,255,0.12)',
      }}>
        {initials || 'U'}
      </div>
    )
  }

  // Botão de logout reutilizado nos dois estados (collapsed / expandido)
  function LogoutBtn({ iconSize = 16 }) {
    return (
      <button
        onClick={logout}
        title="Sair"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 8, color: '#64748b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, transition: 'all 0.15s', flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#fff'
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#64748b'
          e.currentTarget.style.background = 'none'
        }}
      >
        <LogOut size={iconSize} />
      </button>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Botão mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="sidebar-mobile-btn"
        style={{
          display: 'none',
          position: 'fixed', top: 16, left: 16, zIndex: 300,
          background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: 10, padding: 10, cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <Menu size={20} color="#0f172a" />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="sidebar-overlay"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            zIndex: 299, display: 'none',
          }}
        />
      )}

      <aside
        className={`sidebar${mobileOpen ? ' sidebar-mobile-open' : ''}`}
        style={{
          width: sidebarWidth,
          maxWidth: sidebarWidth,
          minHeight: '100vh',
          background: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.22s ease',
          overflowX: 'hidden',
          overflowY: 'hidden',
          flexShrink: 0,
          position: 'relative',
          zIndex: 300,
        }}
      >
        {/* ── Topo: logo do sistema (clicável → /areas, Sprint 5.1/Etapa 6.2) ── */}
        <button
          onClick={() => { navigate('/areas'); setMobileOpen(false) }}
          title="Central de Áreas"
          style={{
            padding: useCollapsedLayout ? '20px 0' : '20px 18px',
            display: 'flex', alignItems: 'center',
            justifyContent: useCollapsedLayout ? 'center' : 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            minHeight: 68,
            background: 'none', border: 'none', cursor: 'pointer', width: '100%',
            textAlign: 'left',
          }}
        >
          {!useCollapsedLayout && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: 1, minWidth: 0 }}>
              <SysLogo />
              <div style={{ overflow: 'hidden', minWidth: 0, maxWidth: '100%' }}>
                <div style={{
                  color: '#fff', fontWeight: 700, fontSize: 15,
                  fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
                }}>
                  {sysNome}
                </div>
                <div style={{
                  color: '#475569', fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
                }}>
                  {sysSubtitulo}
                </div>
              </div>
            </div>
          )}

          {useCollapsedLayout && <SysLogo />}
        </button>

        {/* Fechar no mobile (fora do botão do logo, pra não navegar ao fechar) */}
        <button
          onClick={() => setMobileOpen(false)}
          className="sidebar-close-btn"
          style={{
            display: 'none', background: 'none', border: 'none', cursor: 'pointer',
            padding: 4, position: 'absolute', top: 20, right: 12, zIndex: 1,
          }}
        >
          <X size={20} color="#64748b" />
        </button>

        {/* ── Navegação: áreas departamentais (Sprint 5.1) ──────────────────
            Cada área (useAreaNavigation) é um acordeão — só uma aberta por
            vez — com seus navigationItems como links diretos abaixo dela.
            Recolhida (desktop, fora do drawer mobile), cada área vira um
            único ícone/botão que abre um flyout com os mesmos acessos. */}
        {/* overflowX explícito: setar só overflowY faz o navegador computar
            o eixo X como "auto" também (regra do spec de overflow), abrindo
            uma barra de rolagem horizontal indesejada assim que qualquer
            item interno ficasse mais largo que a Sidebar — essa era a causa
            raiz da rolagem relatada no teste manual. */}
        <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto', overflowX: 'hidden', minWidth: 0, maxWidth: '100%' }}>
          {areaNavigation.map((area) => {
            const AreaIcon = AREA_ICONS[area.icon] || Package
            const areaActive = isAreaActive(area)
            const sortedNavigationItems = getSortedNavigationItems(area)

            // Recolhida: cada área vira um único botão/ícone — nunca navega
            // direto (não há "item padrão" a escolher arbitrariamente);
            // hover, foco ou clique só abrem o flyout com os acessos reais
            // da área (area.navigationItems, já resolvidos/autorizados).
            if (useCollapsedLayout) {
              const flyoutOpen = flyoutAreaId === area.id

              return (
                <div
                  key={area.id}
                  onMouseEnter={cancelCloseFlyout}
                  onMouseLeave={scheduleCloseFlyout}
                >
                  <button
                    onClick={(e) => openFlyout(area.id, e.currentTarget)}
                    onMouseEnter={(e) => openFlyout(area.id, e.currentTarget)}
                    onFocus={(e) => openFlyout(area.id, e.currentTarget)}
                    title={area.name}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 0', justifyContent: 'center',
                      background: areaActive ? `${sysCor}26` : 'transparent',
                      border: 'none',
                      borderLeft: areaActive ? `3px solid ${sysCor}` : '3px solid transparent',
                      color: areaActive ? '#fff' : '#94a3b8',
                      cursor: 'pointer', transition: 'all 0.15s',
                      fontSize: 14, fontWeight: areaActive ? 600 : 400,
                      minWidth: 0, maxWidth: '100%',
                    }}
                  >
                    <AreaIcon size={18} style={{ flexShrink: 0 }} />
                  </button>

                  {/* Flyout via portal em document.body (ver final do
                      arquivo) — um position:absolute comum ficaria cortado
                      pelo overflow do <nav>, que precisamos manter pra
                      eliminar a rolagem horizontal. Some tanto no clique de
                      um item quanto ao tirar o mouse/foco. */}
                  {flyoutOpen && createPortal(
                    <div
                      onMouseEnter={cancelCloseFlyout}
                      onMouseLeave={scheduleCloseFlyout}
                      style={{
                        position: 'fixed', top: flyoutPos.top, left: flyoutPos.left,
                        minWidth: 200, maxWidth: 240,
                        background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10, padding: 6,
                        boxShadow: '0 12px 32px rgba(0,0,0,0.35)', zIndex: 400,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', padding: '4px 10px 6px', whiteSpace: 'nowrap' }}>
                        {area.name}
                      </div>
                      {sortedNavigationItems.map((item) => {
                        const Icon = ICONS[item.icon] || Package
                        const active = isItemActive(item)
                        const label = resolveLabel(item)

                        return (
                          <NavLink
                            key={item.key}
                            to={item.path}
                            onClick={() => { setMobileOpen(false); setFlyoutAreaId(null) }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '8px 10px',
                              borderRadius: 6,
                              fontSize: 13,
                              textDecoration: 'none',
                              color: active ? '#fff' : '#94a3b8',
                              fontWeight: active ? 600 : 400,
                              background: active ? `${sysCor}26` : 'transparent',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Icon size={14} style={{ flexShrink: 0 }} />
                            {label}
                          </NavLink>
                        )
                      })}
                    </div>,
                    document.body
                  )}
                </div>
              )
            }

            // Expandida (ou drawer mobile aberto): a área é um acordeão —
            // só uma aberta por vez — os acessos só aparecem abaixo dela
            // quando aberta.
            const areaExpanded = expandedAreaId === area.id

            return (
              <div key={area.id} style={{ minWidth: 0, maxWidth: '100%' }}>
                <button
                  onClick={() => toggleArea(area.id)}
                  title={area.name}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 18px',
                    background: areaActive ? `${sysCor}1a` : 'transparent',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    color: areaActive ? '#fff' : '#94a3b8',
                    minWidth: 0, maxWidth: '100%',
                  }}
                  onMouseEnter={(e) => { if (!areaActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={(e) => { if (!areaActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <AreaIcon size={16} style={{ flexShrink: 0 }} />
                  <span style={{
                    flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', fontSize: 12, fontWeight: 700,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>
                    {area.name}
                  </span>
                  {areaExpanded
                    ? <ChevronDown size={14} style={{ flexShrink: 0 }} />
                    : <ChevronRightSmall size={14} style={{ flexShrink: 0 }} />}
                </button>

                {areaExpanded && (
                  <div style={{ padding: '2px 0 6px', minWidth: 0, maxWidth: '100%' }}>
                    {sortedNavigationItems.map((item) => {
                      const Icon = ICONS[item.icon] || Package
                      const active = isItemActive(item)
                      const label = resolveLabel(item)

                      return (
                        <NavLink
                          key={item.key}
                          to={item.path}
                          title={label}
                          onClick={() => setMobileOpen(false)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '9px 18px 9px 32px',
                            textDecoration: 'none',
                            color: active ? '#fff' : '#94a3b8',
                            background: active ? `${sysCor}26` : 'transparent',
                            borderLeft: active ? `3px solid ${sysCor}` : '3px solid transparent',
                            transition: 'all 0.15s', fontSize: 13.5,
                            fontWeight: active ? 600 : 400, letterSpacing: '0.01em', whiteSpace: 'nowrap',
                            minWidth: 0, maxWidth: '100%',
                          }}
                        >
                          <Icon size={16} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* ── Usuário (rodapé) ──────────────────────────────────────────── */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: useCollapsedLayout ? '14px 0' : '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: useCollapsedLayout ? 'center' : 'flex-start',
          minHeight: 64,
        }}>
          {useCollapsedLayout ? (
            <LogoutBtn iconSize={18} />
          ) : (
            <>
              <UserAvatar size={36} />

              <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                <div style={{
                  color: '#e2e8f0', fontSize: 13, fontWeight: 600,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  lineHeight: 1.3,
                }}>
                  {displayName}
                </div>
                <div style={{
                  color: '#475569', fontSize: 11,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  lineHeight: 1.3,
                }}>
                  {displayEmail}
                </div>
              </div>

              <LogoutBtn iconSize={16} />
            </>
          )}
        </div>

        {/* ── Collapse (desktop) ────────────────────────────────────────── */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="sidebar-collapse-btn"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: 'none',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: collapsed ? '14px 0' : '13px 18px',
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: '#94a3b8',
            fontSize: 13, fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            transition: 'background 0.15s, color 0.15s',
            minWidth: 0, maxWidth: '100%',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8' }}
        >
          {collapsed ? <PanelLeftOpen size={20} style={{ flexShrink: 0 }} /> : <PanelLeftClose size={20} style={{ flexShrink: 0 }} />}
          {!collapsed && (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              Recolher menu
            </span>
          )}
        </button>
      </aside>

      {/* ── Alça flutuante de recolher/expandir ──────────────────────────
          position:fixed (relativo à viewport, não ao <aside>) — fica
          sempre visível na borda entre sidebar e conteúdo, independente de
          rolagem da página ou do próprio <nav> interno da sidebar (o botão
          "Recolher menu" do rodapé, mais abaixo do <nav>, resolve o mesmo
          problema em telas curtas, mas exige rolar até o fim; esta alça
          cobre o caso de páginas longas sem depender de rolagem nenhuma).
          Oculta em mobile (media query abaixo) — lá a sidebar já é um
          drawer com botão de abrir/fechar próprio. */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="sidebar-edge-toggle"
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        style={{
          position: 'fixed',
          top: '50%',
          left: sidebarWidth - 14,
          transform: 'translateY(-50%)',
          zIndex: 301,
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: '#1e293b',
          border: '1px solid rgba(255,255,255,0.14)',
          color: '#cbd5e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          transition: 'left 0.22s ease, background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#cbd5e1' }}
      >
        {collapsed ? <ChevronRightSmall size={16} /> : <ChevronLeft size={16} />}
      </button>

      <style>{`
        @media (max-width: 768px) {
          .sidebar { position: fixed !important; left: -260px; width: 260px !important; max-width: 260px !important; }
          .sidebar.sidebar-mobile-open { left: 0 !important; }
          .sidebar-mobile-btn  { display: flex !important; }
          .sidebar-overlay     { display: block !important; }
          .sidebar-close-btn   { display: flex !important; }
          .sidebar-collapse-btn { display: none !important; }
          .sidebar-edge-toggle  { display: none !important; }
        }
      `}</style>
    </>
  )
}

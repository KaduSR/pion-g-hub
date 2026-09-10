import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../modules/auth/hooks/useAuth'
import { RequirePermission } from '../modules/permissions/components/RequirePermission'
import { ROUTE_PERMISSIONS } from '../modules/permissions/constants/permissions'
import { AppLayout } from '../shared/components/AppLayout'
import { LoginPage } from '../modules/auth/pages/LoginPage'
import { DashboardPage } from '../modules/fairs/pages/DashboardPage'
import { FairsPage } from '../modules/fairs/pages/FairsPage'
import { LeadCapturePage } from '../modules/fairs/pages/LeadCapturePage'
import { LeadsPage } from '../modules/fairs/pages/LeadsPage'
import { SettingsPage } from '../modules/settings/pages/SettingsPage'
import { MyProfilePage } from '../modules/profiles/pages/MyProfilePage'
import { UsersPage } from '../modules/admin/pages/UsersPage'
import { PermissionsPage } from '../modules/permissions/pages/PermissionsPage'
import { GiftsPage } from '../modules/gifts/pages/GiftsPage'
import { AreasPage } from '../modules/hub/pages/AreasPage'
import { AreaDetailPage } from '../modules/hub/pages/AreaDetailPage'
import { SatisfactionPage } from '../modules/satisfaction/pages/SatisfactionPage'
import { SatisfactionResponsesPage } from '../modules/satisfaction/pages/SatisfactionResponsesPage'
import { PublicSatisfactionPage } from '../modules/satisfaction/pages/PublicSatisfactionPage'
import { KioskCapturePage } from '../modules/kiosk/pages/KioskCapturePage'
import { AutoServicePage } from '../modules/selfservice/pages/AutoServicePage'
import { TicketsDashboard } from '../modules/tickets/pages/TicketsDashboard'
import { TicketCreate } from '../modules/tickets/pages/TicketCreate'
import { TicketDetails } from '../modules/tickets/pages/TicketDetails'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // Sprint 3.7: preserva a rota que o usuário tentava acessar (ex: deep
    // link do botão "Liberar Brinde" do autoatendimento) pra LoginPage
    // devolvê-lo pra lá depois do login, em vez de sempre cair em "/".
    const destination = `${location.pathname}${location.search}`
    return <Navigate to="/login" state={{ from: destination }} replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}

/**
 * Combina autenticação (ProtectedRoute) + permissão (RequirePermission) + layout.
 * Centraliza a ordem de proteção para todas as rotas internas:
 *   1. Usuário autenticado?      → senão /login
 *   2. Perfil carregado?         → senão LoadingScreen (dentro de RequirePermission)
 *   3. Tem a permissão da rota?  → senão rota padrão do seu role
 */
function PrivatePage({ path, children }) {
  const routePermission = ROUTE_PERMISSIONS[path]

  return (
    <ProtectedRoute>
      <RequirePermission {...routePermission}>
        <AppLayout>{children}</AppLayout>
      </RequirePermission>
    </ProtectedRoute>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Rota pública - sem layout */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

      {/* Pesquisa de satisfação pública (Sprint 3.5): sem login, sem Sidebar/AppLayout — visitante acessa via link/QR Code */}
      <Route path="/pesquisa/:publicToken" element={<PublicSatisfactionPage />} />

      {/* Autoatendimento em tablet (Sprint 3.6): sem login, sem Sidebar/AppLayout —
          /autoatendimento pede pra escolher a feira; /autoatendimento/:feiraId já vem pré-definida via link fixado no tablet do estande */}
      <Route path="/autoatendimento" element={<KioskCapturePage />} />
      <Route path="/autoatendimento/:feiraId" element={<KioskCapturePage />} />

      {/* Rotas protegidas - autenticação + permissão + AppLayout (Sidebar + main) */}
      {/* "/" deixou de ser o Dashboard na Sprint 3.3 e passou pela Central de
          Módulos (/modulos) até a Sprint 3.5; a partir da Sprint 5.1, Etapa 5,
          a Central de Áreas (/areas) assume oficialmente como tela inicial
          após login. /modulos vira rota legada (redirect), preservando
          favoritos/links antigos sem quebrar. /areas/:areaId reaproveita a
          permissão de "/areas", mesmo padrão já usado por /ti/:id abaixo com
          "/ti". */}
      <Route path="/" element={<Navigate to="/areas" replace />} />
      <Route path="/modulos" element={<Navigate to="/areas" replace />} />
      <Route path="/areas" element={<PrivatePage path="/areas"><AreasPage /></PrivatePage>} />
      <Route path="/areas/:areaId" element={<PrivatePage path="/areas"><AreaDetailPage /></PrivatePage>} />
      <Route path="/dashboard" element={<PrivatePage path="/dashboard"><DashboardPage /></PrivatePage>} />
      <Route path="/feiras" element={<PrivatePage path="/feiras"><FairsPage /></PrivatePage>} />
      <Route path="/captacao" element={<PrivatePage path="/captacao"><LeadCapturePage /></PrivatePage>} />
      {/* Autoatendimento interno (staff, autenticado) — distinto de /autoatendimento (kiosk público, sem login).
          /atendimento/:feiraId é o link copiado no card da feira (FairsPage): mesma proteção/permissão/layout
          da rota sem parâmetro, só que a feira já vem pré-selecionada dentro de AutoServicePage. */}
      <Route path="/atendimento" element={<PrivatePage path="/atendimento"><AutoServicePage /></PrivatePage>} />
      <Route path="/atendimento/:feiraId" element={<PrivatePage path="/atendimento"><AutoServicePage /></PrivatePage>} />
      <Route path="/leads" element={<PrivatePage path="/leads"><LeadsPage /></PrivatePage>} />
      <Route path="/admin/usuarios" element={<PrivatePage path="/admin/usuarios"><UsersPage /></PrivatePage>} />
      <Route path="/admin/permissoes" element={<PrivatePage path="/admin/permissoes"><PermissionsPage /></PrivatePage>} />
      <Route path="/brindes" element={<PrivatePage path="/brindes"><GiftsPage /></PrivatePage>} />
      <Route path="/pesquisas" element={<PrivatePage path="/pesquisas"><SatisfactionPage /></PrivatePage>} />
      <Route path="/pesquisas/respostas" element={<PrivatePage path="/pesquisas/respostas"><SatisfactionResponsesPage /></PrivatePage>} />
      <Route path="/configuracoes" element={<PrivatePage path="/configuracoes"><SettingsPage /></PrivatePage>} />
      <Route path="/meu-perfil" element={<PrivatePage path="/meu-perfil"><MyProfilePage /></PrivatePage>} />

      {/* Chamados de TI (Sprint 4.2 — Portal do Solicitante). /ti/:id reaproveita
          a permissão de "/ti" (mesma regra do padrão /atendimento/:feiraId acima). */}
      <Route path="/ti" element={<PrivatePage path="/ti"><TicketsDashboard /></PrivatePage>} />
      <Route path="/ti/novo" element={<PrivatePage path="/ti/novo"><TicketCreate /></PrivatePage>} />
      <Route path="/ti/:id" element={<PrivatePage path="/ti"><TicketDetails /></PrivatePage>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

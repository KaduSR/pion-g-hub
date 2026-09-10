import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './modules/auth/contexts/AuthContext'
import { ProfileProvider } from './modules/profiles/contexts/ProfileContext'
import { PermissionsProvider } from './modules/permissions/contexts/PermissionsContext'
import { FairsProvider } from './modules/fairs/contexts/FairsContext'
import { SettingsProvider } from './modules/settings/contexts/SettingsContext'
import { AppRoutes } from './routes/AppRoutes'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* ProfileProvider fica dentro de AuthProvider (precisa de user)
            e fora de FairsProvider (perfil não depende de feiras).
            PermissionsProvider fica dentro de ProfileProvider (precisa de
            profile.id/role) e fora de tudo que possa usar usePermissions()
            do contexto — Sidebar/AppLayout ficam dentro de AppRoutes. */}
        <ProfileProvider>
          <PermissionsProvider>
            <SettingsProvider>
              <FairsProvider>
                <AppRoutes />
              </FairsProvider>
            </SettingsProvider>
          </PermissionsProvider>
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}


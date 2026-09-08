import { NavLink, Outlet } from 'react-router-dom';

const SIDEBAR_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/rh/colaboradores', label: 'Colaboradores', icon: '👥' },
  { to: '/rh/escalas', label: 'Escalas', icon: '📅' },
  { to: '/rh/pontos', label: 'Ponto', icon: '⏱️' },
  { to: '/logistica', label: 'Logística', icon: '🚚' },
  { to: '/cadastros/areas', label: 'Áreas', icon: '🗂️' },
  { to: '/cadastros/departamentos', label: 'Departamentos', icon: '🏢' },
  { to: '/cadastros/setores', label: 'Setores', icon: '🏭' },
  { to: '/cadastros/cargos', label: 'Cargos', icon: '💼' },
  { to: '/cadastros/motivos-refugo', label: 'Motivos Refugo', icon: '⚠️' },
  { to: '/cadastros/defeitos-refugo', label: 'Defeitos Refugo', icon: '🔧' },
  { to: '/relatorios', label: 'Relatórios', icon: '📈' },
  { to: '/auditoria', label: 'Auditoria', icon: '🔍' },
  { to: '/configuracoes/webhooks', label: 'Webhooks', icon: '🔗' },
];

export function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: '260px',
        background: '#111827',
        color: '#f9fafb',
        padding: '1.5rem 1rem',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', padding: '0 0.5rem' }}>
          Pion-G-Hub
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {SIDEBAR_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.75rem',
                borderRadius: '6px',
                textDecoration: 'none',
                color: isActive ? '#ffffff' : '#d1d5db',
                background: isActive ? '#374151' : 'transparent',
                fontSize: '0.9375rem',
                fontWeight: isActive ? 600 : 400,
                transition: 'background 0.15s, color 0.15s',
              })}
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, background: '#f3f4f6', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}

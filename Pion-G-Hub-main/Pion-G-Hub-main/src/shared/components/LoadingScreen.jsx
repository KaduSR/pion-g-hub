export function LoadingScreen({
  nome = 'Pion G Marketing Hub',
  cor = '#1B3A6B',
  logoUrl = null
}) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    }}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={nome}
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            marginBottom: 24,
            objectFit: 'contain'
          }}
        />
      ) : (
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: cor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, fontWeight: 800, color: '#fff',
          fontFamily: 'Space Grotesk, sans-serif',
          marginBottom: 24,
        }}>
          {nome[0]?.toUpperCase() || 'P'}
        </div>
      )}

      <div className="spinner" style={{
        width: 40, height: 40,
        border: '4px solid rgba(255,255,255,0.1)',
        borderTopColor: cor,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />

      <p style={{
        color: '#94a3b8',
        fontSize: 15,
        marginTop: 16,
        fontFamily: 'Inter, sans-serif'
      }}>
        Carregando {nome}...
      </p>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

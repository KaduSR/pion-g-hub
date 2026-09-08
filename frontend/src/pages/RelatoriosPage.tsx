import { useState } from 'react';
import { relatoriosApi } from '../shared/api';

export function RelatoriosPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (tipo: 'colaboradores' | 'logistica') => {
    setDownloading(tipo);
    try {
      const blob = tipo === 'colaboradores'
        ? await relatoriosApi.baixarColaboradoresCSV()
        : await relatoriosApi.baixarLogisticaCSV();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = tipo === 'colaboradores' ? 'relatorio_colaboradores.csv' : 'relatorio_logistica.csv';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(`Erro ao baixar relatório de ${tipo}:`, error);
      alert(`Erro ao gerar o arquivo: ${error.message || 'Tente novamente mais tarde'}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Central de Relatórios</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginTop: '1rem'
      }}>
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            margin: '0 0 0.5rem 0',
            color: '#111827'
          }}>
            Relatório de Colaboradores
          </h2>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: '0 0 1rem 0'
          }}>
            Exporta dados de colaboradores em formato CSV para análise.
          </p>
          <button
            onClick={() => handleDownload('colaboradores')}
            disabled={!!downloading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: downloading ? 'not-allowed' : 'pointer',
              opacity: downloading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {downloading === 'colaboradores' ? 'Gerando arquivo...' : 'Baixar CSV'}
          </button>
        </div>

        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            margin: '0 0 0.5rem 0',
            color: '#111827'
          }}>
            Relatório de Operações Logísticas
          </h2>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: '0 0 1rem 0'
          }}>
            Exporta dados de operações logísticas em formato CSV.
          </p>
          <button
            onClick={() => handleDownload('logistica')}
            disabled={!!downloading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: downloading ? 'not-allowed' : 'pointer',
              opacity: downloading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {downloading === 'logistica' ? 'Gerando arquivo...' : 'Baixar CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}
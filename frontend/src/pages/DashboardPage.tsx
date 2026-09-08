import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { dashboardApi } from '../shared/api';
import type { IDashboardMetrics } from '../types/cadastros';

export function DashboardPage() {
  const [data, setData] = useState<IDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    dashboardApi.getMetrics().then(d => { if (!cancelled) { setData(d); setLoading(false); } }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Carregando indicadores...</div>;
  if (!data) return <div style={{ padding: '2rem' }}>Sem dados.</div>;

  const colaboradorAtivos = data.colaboradores.find((c: any) => c.status === 'Ativo')?.total || 0;
  const colaboradorInativos = data.colaboradores.find((c: any) => c.status === 'Inativo')?.total || 0;
  const logStatus = (s: string) => data.logistica.find((l: any) => l.status_operacao === s)?.total || 0;

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Dashboard Gerencial — Pion-G-Hub</h1>
      <Link
        to="/relatorios"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#6366f1',
          color: '#ffffff',
          borderRadius: '6px',
          textDecoration: 'none',
          fontSize: '0.875rem',
          fontWeight: 500,
          marginBottom: '1rem'
        }}
      >
        Central de Relatórios
      </Link>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Colaboradores Ativos</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{colaboradorAtivos}</div>
        </div>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Colaboradores Inativos</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{colaboradorInativos}</div>
        </div>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Pontos Hoje</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.pontoHoje}</div>
        </div>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Escalas Mês</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.escalasMes}</div>
        </div>
      </div>
      <h2 style={{ marginTop: '2rem', fontSize: '1.25rem' }}>Operações de Logística — Status</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
        {['Pendente','Em Trânsito','Entregue','Cancelado'].map(s => (
          <div key={s} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#374151' }}>{s}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{logStatus(s)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

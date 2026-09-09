import { useEffect, useState } from 'react';
import { BaseTable, type Column } from '../components/BaseTable';
import { auditoriaApi } from '../shared/api';
import type { ILogAuditoria } from '../types/cadastros';

export function AuditoriaPage() {
  const [logs, setLogs] = useState<ILogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErro(null);

    auditoriaApi.listar()
      .then(res => {
        if (!cancelled) {
          setLogs(res.data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErro(err.message || 'Erro ao carregar logs de auditoria.');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  const formatarDataHora = (valor: string) => {
    if (!valor) return '-';
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor;
    return data.toLocaleString('pt-BR');
  };

  const renderDetalhes = (log: ILogAuditoria) => {
    if (!log.detalhes || log.detalhes === '{}' || log.detalhes === 'null') return '-';

    try {
      const objeto = typeof log.detalhes === 'string' ? JSON.parse(log.detalhes) : log.detalhes;
      const preview = typeof objeto === 'object' && objeto !== null
        ? JSON.stringify(objeto)
        : String(objeto);

      return (
        <span title={preview} style={{ cursor: 'default' }}>
          {preview.length > 80 ? `${preview.slice(0, 77)}...` : preview}
        </span>
      );
    } catch {
      return String(log.detalhes).slice(0, 80);
    }
  };

  const columns: Column<ILogAuditoria>[] = [
    { key: 'criado_em', header: 'DATA/HORA', render: (item) => <span>{formatarDataHora(item.criado_em)}</span> },
    { key: 'ator_identificacao', header: 'USUÁRIO' },
    { key: 'acao', header: 'AÇÃO' },
    { key: 'tabela_afetada', header: 'TABELA AFETADA', render: (item) => <span>{item.tabela_afetada || '-'}</span> },
    { key: 'registro_id', header: 'ID DO REGISTRO', render: (item) => <span>{item.registro_id || '-'}</span> },
    { key: 'detalhes', header: 'DETALHES', render: renderDetalhes },
  ];

  if (loading) return <div style={{ padding: '2rem' }}>Carregando logs de auditoria...</div>;

  return (
    <>
      {erro && (
        <div style={{
          padding: '1rem',
          background: '#ffebee',
          color: '#c62828',
          marginBottom: '1rem',
          border: '1px solid #ffcdd2',
          borderRadius: '6px'
        }}>
          {erro}
        </div>
      )}

      <BaseTable
        title="Auditoria — Logs do Sistema"
        columns={columns}
        data={logs}
        addLabel={undefined}
        onAdd={undefined}
      />

      {!erro && logs.length === 0 && (
        <div style={{ padding: '1rem', color: '#6b7280' }}>
          Nenhum registro de auditoria encontrado.
        </div>
      )}
    </>
  );
}
export default AuditoriaPage;

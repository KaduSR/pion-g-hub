import { useEffect, useState } from 'react';
import { BaseTable, type Column } from '../components/BaseTable';
import { BaseModal } from '../shared/components/BaseModal';
import { webhooksApi } from '../shared/api';
import type { IWebhookConfig } from '../types/cadastros';

const EVENTOS_SUPORTADOS = [
  { value: 'logistica.criada', label: 'Logística — Criada' },
  { value: 'logistica.atualizada', label: 'Logística — Atualizada' },
  { value: 'ponto.registrado', label: 'Ponto — Registrado' },
  { value: 'ponto.corrigido', label: 'Ponto — Corrigido' },
  { value: 'escala.criada', label: 'Escala — Criada' },
  { value: 'colaborador.criado', label: 'Colaborador — Criado' },
  { value: 'refugo.registrado', label: 'Refugo — Registrado' },
  { value: 'dashboard.atualizado', label: 'Dashboard — Atualizado' },
];

const emptyForm = (): Omit<IWebhookConfig, 'id' | 'criado_em'> => ({
  evento: EVENTOS_SUPORTADOS[0].value,
  url_destino: '',
  ativo: true,
});

export function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<IWebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    webhooksApi.listar()
      .then((data) => {
        if (!cancelled) { setWebhooks(data); setLoading(false); }
      })
      .catch((err) => {
        if (!cancelled) { setError(err.message || 'Erro ao carregar webhooks'); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (item: IWebhookConfig) => {
    setEditingId(item.id);
    setForm({
      evento: item.evento,
      url_destino: item.url_destino,
      ativo: item.ativo,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let saved: IWebhookConfig;
      if (editingId) {
        saved = await webhooksApi.atualizar(editingId, form);
        setWebhooks((prev) => prev.map((w) => (w.id === editingId ? saved : w)));
      } else {
        saved = await webhooksApi.criar(form);
        setWebhooks((prev) => [...prev, saved]);
      }
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este webhook?')) return;
    setError(null);
    try {
      await webhooksApi.excluir(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir webhook');
    }
  };

  const columns: Column<IWebhookConfig>[] = [
    { key: 'evento', header: 'EVENTO' },
    { key: 'url_destino', header: 'URL DE DESTINO' },
    {
      key: 'ativo',
      header: 'STATUS',
      render: (item) => (
        <span style={{ color: item.ativo ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
          {item.ativo ? 'ATIVO' : 'INATIVO'}
        </span>
      ),
    },
    {
      key: 'criado_em',
      header: 'CRIADO EM',
      render: (item) => {
        if (!item.criado_em) return '';
        const d = new Date(item.criado_em);
        return d.toLocaleString('pt-BR');
      },
    },
    {
      key: 'acoes',
      header: 'AÇÕES',
      render: (item) => (
        <div>
          <button onClick={() => openEdit(item as IWebhookConfig)} style={{ marginRight: '0.5rem' }}>
            Editar
          </button>
          <button onClick={() => handleDelete((item as IWebhookConfig).id)}>Excluir</button>
        </div>
      ),
    },
  ];

  if (loading) return <div style={{ padding: '2rem' }}>Carregando webhooks...</div>;

  return (
    <>
      {error && (
        <div style={{ padding: '1rem', background: '#ffebee', color: '#c62828', marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      <BaseTable
        title="Gerenciamento de Webhooks"
        columns={columns}
        data={webhooks}
        addLabel="Novo Webhook"
        onAdd={openCreate}
      />
      <BaseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Webhook' : 'Novo Webhook'}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Evento</label>
            <select
              value={form.evento}
              onChange={(e) => setForm({ ...form, evento: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            >
              {EVENTOS_SUPORTADOS.map((ev) => (
                <option key={ev.value} value={ev.value}>{ev.label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>URL de Destino</label>
            <input
              type="url"
              value={form.url_destino}
              onChange={(e) => setForm({ ...form, url_destino: e.target.value })}
              required
              placeholder="https://..."
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              />
              Ativo
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" onClick={() => setModalOpen(false)} style={{ padding: '0.5rem 1rem' }} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" style={{ padding: '0.5rem 1rem' }} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </BaseModal>
    </>
  );
}

export default WebhooksPage;

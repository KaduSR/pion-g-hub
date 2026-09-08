import { useEffect, useState } from 'react';
import { BaseTable, type Column } from '../components/BaseTable';
import { BaseModal } from '../shared/components/BaseModal';
import { cadastrosService } from '../services/cadastrosService';
import type { IArea } from '../types/cadastros';
import { useNotify } from '../contexts/NotificationContext';

const emptyForm = (): Omit<IArea, 'id'> => ({
  descricao: '',
  descricao_curta: '',
  status: 'Ativo',
});

export function AreasPage() {
  const [areas, setAreas] = useState<IArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notify = useNotify();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    cadastrosService.getAreas()
      .then((data) => {
        if (!cancelled) {
          setAreas(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Erro ao carregar areas');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (area: IArea) => {
    setEditingId(area.id);
    setForm({
      descricao: area.descricao,
      descricao_curta: area.descricao_curta,
      status: area.status,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let saved: IArea;
      if (editingId) {
        saved = await cadastrosService.updateArea(editingId, form);
      } else {
        saved = await cadastrosService.createArea(form);
      }
      setAreas((prev) => {
        if (editingId) {
          return prev.map((a) => (a.id === editingId ? saved : a));
        }
        return [...prev, saved];
      });
      notify.success(editingId ? 'Area atualizada com sucesso!' : 'Area criada com sucesso!');
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar area');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await cadastrosService.deleteArea(id);
      setAreas((prev) => prev.filter((a) => a.id !== id));
      notify.success('Area excluida com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir area');
    }
  };

  const columns: Column<IArea>[] = [
    { key: 'descricao', header: 'DESCRICAO' },
    { key: 'descricao_curta', header: 'DESCRICAO CURTA' },
    { key: 'status', header: 'STATUS' },
    {
      key: 'acoes',
      header: 'ACOES',
      render: (item) => (
        <div>
          <button onClick={() => openEdit(item as IArea)} style={{ marginRight: '0.5rem' }}>
            Editar
          </button>
          <button onClick={() => handleDelete((item as IArea).id)}>Excluir</button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div style={{ padding: '2rem' }}>Carregando areas...</div>;
  }

  return (
    <>
      {error && (
        <div style={{ padding: '1rem', background: '#ffebee', color: '#c62828', marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      <BaseTable
        title="Areas"
        columns={columns}
        data={areas}
        addLabel="Adicionar Area"
        onAdd={openCreate}
        searchPlaceholder="Pesquisar areas..."
        searchKeys={['descricao', 'descricao_curta']}
      />
      <BaseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Area' : 'Nova Area'}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Descricao</label>
            <input
              type="text"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Descricao Curta</label>
            <input
              type="text"
              value={form.descricao_curta}
              onChange={(e) => setForm({ ...form, descricao_curta: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={form.status === 'Ativo'}
                onChange={(e) => setForm({ ...form, status: e.target.checked ? 'Ativo' : 'Inativo' })}
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

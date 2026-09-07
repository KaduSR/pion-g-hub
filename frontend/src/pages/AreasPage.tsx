import { useEffect, useState } from 'react';
import { BaseTable, type Column } from '../components/BaseTable';
import { BaseModal } from '../shared/components/BaseModal';
import { cadastrosService } from '../services/cadastrosService';
import type { IArea } from '../types/cadastros';

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cadastrosService.getAreas().then((data) => {
      if (!cancelled) {
        setAreas(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (area: IArea) => {
    setEditingId(area.id);
    setForm({
      descricao: area.descricao,
      descricao_curta: area.descricao_curta,
      status: area.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setAreas((prev) => prev.map((a) => (a.id === editingId ? { ...a, ...form } : a)));
    } else {
      const newArea: IArea = {
        id: Date.now().toString(),
        ...form,
      };
      setAreas((prev) => [...prev, newArea]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setAreas((prev) => prev.filter((a) => a.id !== id));
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
      <BaseTable
        title="Areas"
        columns={columns}
        data={areas}
        addLabel="Adicionar Area"
        onAdd={openCreate}
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
            <button type="button" onClick={() => setModalOpen(false)} style={{ padding: '0.5rem 1rem' }}>
              Cancelar
            </button>
            <button type="submit" style={{ padding: '0.5rem 1rem' }}>
              Salvar
            </button>
          </div>
        </form>
      </BaseModal>
    </>
  );
}

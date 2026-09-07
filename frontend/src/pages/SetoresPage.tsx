import { useEffect, useState } from 'react';
import { BaseTable, type Column } from '../components/BaseTable';
import { BaseModal } from '../shared/components/BaseModal';
import { cadastrosService } from '../services/cadastrosService';
import type { ISetor } from '../types/cadastros';

const emptyForm = (): Omit<ISetor, 'id'> => ({
  descricao: '',
  descricao_curta: '',
  status: 'Ativo',
});

export function SetoresPage() {
  const [setores, setSetores] = useState<ISetor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cadastrosService.getSetores().then((data) => {
      if (!cancelled) {
        setSetores(data);
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

  const openEdit = (setor: ISetor) => {
    setEditingId(setor.id);
    setForm({
      descricao: setor.descricao,
      descricao_curta: setor.descricao_curta,
      status: setor.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const updated = await cadastrosService.updateSetor(editingId, form);
      setSetores((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
    } else {
      const created = await cadastrosService.createSetor(form);
      setSetores((prev) => [...prev, created]);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este setor?')) {
      return;
    }
    await cadastrosService.deleteSetor(id);
    setSetores((prev) => prev.filter((s) => s.id !== id));
  };

  const columns: Column<ISetor>[] = [
    { key: 'descricao', header: 'DESCRICAO' },
    { key: 'descricao_curta', header: 'DESCRICAO CURTA' },
    { key: 'status', header: 'STATUS' },
    {
      key: 'acoes',
      header: 'ACOES',
      render: (item) => (
        <div>
          <button onClick={() => openEdit(item as ISetor)} style={{ marginRight: '0.5rem' }}>
            Editar
          </button>
          <button onClick={() => handleDelete((item as ISetor).id)}>Excluir</button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div style={{ padding: '2rem' }}>Carregando setores...</div>;
  }

  return (
    <>
      <BaseTable
        title="Setores"
        columns={columns}
        data={setores}
        addLabel="Adicionar Setor"
        onAdd={openCreate}
      />
      <BaseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Setor' : 'Novo Setor'}>
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

import { useEffect, useState } from 'react';
import { BaseTable, type Column } from '../components/BaseTable';
import { BaseModal } from '../shared/components/BaseModal';
import { cadastrosService } from '../services/cadastrosService';
import type { ICargo } from '../types/cadastros';
import { useNotify } from '../contexts/NotificationContext';

const emptyForm = (): Omit<ICargo, 'id'> => ({
  descricao: '',
  descricao_curta: '',
  status: 'Ativo',
});

export function CargosPage() {
  const [cargos, setCargos] = useState<ICargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const notify = useNotify();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cadastrosService.getCargos().then((data) => {
      if (!cancelled) {
        setCargos(data);
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

  const openEdit = (cargo: ICargo) => {
    setEditingId(cargo.id);
    setForm({
      descricao: cargo.descricao,
      descricao_curta: cargo.descricao_curta,
      status: cargo.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const updated = await cadastrosService.updateCargo(editingId, form);
      setCargos((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
      notify.success('Cargo atualizado com sucesso!');
    } else {
      const created = await cadastrosService.createCargo(form);
      setCargos((prev) => [...prev, created]);
      notify.success('Cargo criado com sucesso!');
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await cadastrosService.deleteCargo(id);
    setCargos((prev) => prev.filter((c) => c.id !== id));
    notify.success('Cargo excluido com sucesso!');
  };

  const columns: Column<ICargo>[] = [
    { key: 'descricao', header: 'DESCRICAO' },
    { key: 'descricao_curta', header: 'DESCRICAO CURTA' },
    { key: 'status', header: 'STATUS' },
    {
      key: 'acoes',
      header: 'ACOES',
      render: (item) => (
        <div>
          <button onClick={() => openEdit(item as ICargo)} style={{ marginRight: '0.5rem' }}>
            Editar
          </button>
          <button onClick={() => handleDelete((item as ICargo).id)}>Excluir</button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div style={{ padding: '2rem' }}>Carregando cargos...</div>;
  }

  return (
    <>
      <BaseTable
        title="Cargos"
        columns={columns}
        data={cargos}
        addLabel="Adicionar Cargo"
        onAdd={openCreate}
        searchPlaceholder="Pesquisar cargos..."
        searchKeys={['descricao', 'descricao_curta']}
      />
      <BaseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Cargo' : 'Novo Cargo'}>
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

import { useEffect, useState } from 'react';
import { BaseTable, type Column } from '../components/BaseTable';
import { BaseModal } from '../shared/components/BaseModal';
import { cadastrosService } from '../services/cadastrosService';
import type { IDepartamento } from '../types/cadastros';
import { useNotify } from '../contexts/NotificationContext';

const emptyForm = (): Omit<IDepartamento, 'id'> => ({
  descricao: '',
  descricao_curta: '',
  status: 'Ativo',
});

export function DepartamentosPage() {
  const [departamentos, setDepartamentos] = useState<IDepartamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const notify = useNotify();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cadastrosService.getDepartamentos().then((data) => {
      if (!cancelled) {
        setDepartamentos(data);
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

  const openEdit = (departamento: IDepartamento) => {
    setEditingId(departamento.id);
    setForm({
      descricao: departamento.descricao,
      descricao_curta: departamento.descricao_curta,
      status: departamento.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setDepartamentos((prev) => prev.map((d) => (d.id === editingId ? { ...d, ...form } : d)));
      notify.success('Departamento atualizado com sucesso!');
    } else {
      const newDept: IDepartamento = {
        id: Date.now().toString(),
        ...form,
      };
      setDepartamentos((prev) => [...prev, newDept]);
      notify.success('Departamento criado com sucesso!');
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    setDepartamentos((prev) => prev.filter((d) => d.id !== id));
    notify.success('Departamento excluido com sucesso!');
  };

  const columns: Column<IDepartamento>[] = [
    { key: 'descricao', header: 'DESCRICAO' },
    { key: 'descricao_curta', header: 'DESCRICAO CURTA' },
    { key: 'status', header: 'STATUS' },
    {
      key: 'acoes',
      header: 'ACOES',
      render: (item) => (
        <div>
          <button onClick={() => openEdit(item as IDepartamento)} style={{ marginRight: '0.5rem' }}>
            Editar
          </button>
          <button onClick={() => handleDelete((item as IDepartamento).id)}>Excluir</button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div style={{ padding: '2rem' }}>Carregando departamentos...</div>;
  }

  return (
    <>
      <BaseTable
        title="Departamentos"
        columns={columns}
        data={departamentos}
        addLabel="Adicionar Departamento"
        onAdd={openCreate}
        searchPlaceholder="Pesquisar departamentos..."
        searchKeys={['descricao', 'descricao_curta']}
      />
      <BaseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Departamento' : 'Novo Departamento'}>
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

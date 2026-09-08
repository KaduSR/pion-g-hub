import { useEffect, useState } from 'react';
import { BaseTable, type Column } from '../components/BaseTable';
import { BaseModal } from '../shared/components/BaseModal';
import { colaboradoresApi, cargosApi, departamentosApi } from '../shared/api';
import type { IColaborador, ICargo, IDepartamento } from '../types/cadastros';

const emptyForm = (): Omit<IColaborador, 'id' | 'status' | 'cargo_nome' | 'departamento_nome'> => ({
  nome: '',
  matricula: '',
  cpf: '',
  cargo_id: '',
  departamento_id: '',
});

export function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<IColaborador[]>([]);
  const [cargos, setCargos] = useState<ICargo[]>([]);
  const [departamentos, setDepartamentos] = useState<IDepartamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');

  // Buscar colaboradores, cargos e departamentos
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      colaboradoresApi.listar(),
      cargosApi.listar(),
      departamentosApi.listar(),
    ]).then(([colData, cargoData, deptData]) => {
      if (!cancelled) {
        setColaboradores(colData);
        setCargos(cargoData);
        setDepartamentos(deptData);
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

  const openEdit = (colab: IColaborador) => {
    setEditingId(colab.id);
    setForm({
      nome: colab.nome,
      matricula: colab.matricula,
      cpf: colab.cpf,
      cargo_id: colab.cargo_id,
      departamento_id: colab.departamento_id,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nome: form.nome,
      matricula: form.matricula,
      cpf: form.cpf,
      cargo_id: form.cargo_id,
      departamento_id: form.departamento_id,
      status: 'Ativo',
    };
    if (editingId) {
      const updated = await colaboradoresApi.atualizar(editingId, payload);
      setColaboradores((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
    } else {
      const created = await colaboradoresApi.criar(payload);
      setColaboradores((prev) => [...prev, created]);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este colaborador?')) return;
    await colaboradoresApi.excluir(id);
    setColaboradores((prev) => prev.filter((c) => c.id !== id));
  };

  const columns: Column<IColaborador>[] = [
    { key: 'nome', header: 'NOME' },
    { key: 'matricula', header: 'MATRÍCULA' },
    { key: 'cargo_nome', header: 'CARGO' },
    { key: 'departamento_nome', header: 'DEPARTAMENTO' },
    { key: 'status', header: 'STATUS' },
    {
      key: 'acoes',
      header: 'AÇÕES',
      render: (item) => (
        <div>
          <button onClick={() => openEdit(item as IColaborador)} style={{ marginRight: '0.5rem' }}>
            Editar
          </button>
          <button onClick={() => handleDelete((item as IColaborador).id)}>Excluir</button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div style={{ padding: '2rem' }}>Carregando colaboradores...</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Pesquisar por nome, matrícula, cargo ou departamento..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ flex: '1 1 280px', padding: '0.5rem', boxSizing: 'border-box' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.5rem', boxSizing: 'border-box' }}
        >
          <option value="Todos">Todos os status</option>
          <option value="Ativo">Ativo</option>
          <option value="Inativo">Inativo</option>
          <option value="Afastado">Afastado</option>
          <option value="Ferias">Férias</option>
        </select>
      </div>
      {(() => {
        const term = searchText.trim().toLowerCase();
        const filtered = colaboradores.filter((c) => {
          const matchesText =
            !term ||
            c.nome.toLowerCase().includes(term) ||
            c.matricula.toLowerCase().includes(term) ||
            (c.cargo_nome || '').toLowerCase().includes(term) ||
            (c.departamento_nome || '').toLowerCase().includes(term);
          const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
          return matchesText && matchesStatus;
        });

        return (
          <BaseTable
            title="Colaboradores (RH)"
            columns={columns}
            data={filtered}
            addLabel="Novo Colaborador"
            onAdd={openCreate}
          />
        );
      })()}
      <BaseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Colaborador' : 'Novo Colaborador'}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Nome</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Matrícula</label>
            <input
              type="text"
              value={form.matricula}
              onChange={(e) => setForm({ ...form, matricula: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>CPF</label>
            <input
              type="text"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Cargo</label>
            <select
              value={form.cargo_id}
              onChange={(e) => setForm({ ...form, cargo_id: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            >
              <option value="">Selecione...</option>
              {cargos.map((c) => (
                <option key={c.id} value={c.id}>{c.descricao}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Departamento</label>
            <select
              value={form.departamento_id}
              onChange={(e) => setForm({ ...form, departamento_id: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            >
              <option value="">Selecione...</option>
              {departamentos.map((d) => (
                <option key={d.id} value={d.id}>{d.descricao}</option>
              ))}
            </select>
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

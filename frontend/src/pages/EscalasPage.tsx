import { useEffect, useState } from 'react';
import { BaseTable, type Column } from '../components/BaseTable';
import { BaseModal } from '../shared/components/BaseModal';
import { escalasApi, colaboradoresApi } from '../shared/api';
import type { IEscala, IColaborador } from '../types/cadastros';

const emptyForm = (): Omit<IEscala, 'id' | 'colaborador_nome'> => ({
  colaborador_id: '',
  data_escala: '',
  turno: '',
  status: 'Previsto',
});

export function EscalasPage() {
  const [escalas, setEscalas] = useState<IEscala[]>([]);
  const [colaboradores, setColaboradores] = useState<IColaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      escalasApi.listar(),
      colaboradoresApi.listar(),
    ]).then(([escData, colData]) => {
      if (!cancelled) {
        setEscalas(escData);
        setColaboradores(colData);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (esc: IEscala) => {
    setEditingId(esc.id);
    setForm({
      colaborador_id: esc.colaborador_id,
      data_escala: esc.data_escala?.split('T')[0] || esc.data_escala,
      turno: esc.turno,
      status: esc.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      colaborador_id: form.colaborador_id,
      data_escala: form.data_escala,
      turno: form.turno,
      status: form.status,
    };
    if (editingId) {
      const updated = await escalasApi.atualizar(editingId, payload);
      setEscalas((prev) => prev.map((e) => (e.id === editingId ? updated : e)));
    } else {
      const created = await escalasApi.criar(payload);
      setEscalas((prev) => [...prev, created]);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta escala?')) return;
    await escalasApi.excluir(id);
    setEscalas((prev) => prev.filter((e) => e.id !== id));
  };

  const columns: Column<IEscala>[] = [
    { key: 'colaborador_nome', header: 'COLABORADOR' },
    { key: 'data_escala', header: 'DATA' },
    { key: 'turno', header: 'TURNO' },
    { key: 'status', header: 'STATUS' },
    {
      key: 'acoes',
      header: 'AÇÕES',
      render: (item) => (
        <div>
          <button onClick={() => openEdit(item as IEscala)} style={{ marginRight: '0.5rem' }}>Editar</button>
          <button onClick={() => handleDelete((item as IEscala).id)}>Excluir</button>
        </div>
      ),
    },
  ];

  if (loading) return <div style={{ padding: '2rem' }}>Carregando escalas...</div>;

  return (
    <>
      <BaseTable
        title="Escala do Mês"
        columns={columns}
        data={escalas}
        addLabel="Nova Escala"
        onAdd={openCreate}
      />
      <BaseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Escala' : 'Nova Escala'}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Colaborador</label>
            <select value={form.colaborador_id} onChange={(e) => setForm({ ...form, colaborador_id: e.target.value })} required style={{ width: '100%', padding: '0.5rem' }}>
              <option value="">Selecione...</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Data</label>
            <input type="date" value={form.data_escala} onChange={(e) => setForm({ ...form, data_escala: e.target.value })} required style={{ width: '100%', padding: '0.5rem' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Turno</label>
            <select value={form.turno} onChange={(e) => setForm({ ...form, turno: e.target.value })} required style={{ width: '100%', padding: '0.5rem' }}>
              <option value="">Selecione...</option>
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Noite">Noite</option>
              <option value="Comercial">Comercial</option>
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} required style={{ width: '100%', padding: '0.5rem' }}>
              <option value="Previsto">Previsto</option>
              <option value="Realizado">Realizado</option>
              <option value="Folga">Folga</option>
              <option value="Falta">Falta</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit">Salvar</button>
          </div>
        </form>
      </BaseModal>
    </>
  );
}

export default EscalasPage;

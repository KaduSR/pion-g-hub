import { useEffect, useState } from 'react';
import { BaseTable, type Column } from '../components/BaseTable';
import { BaseModal } from '../shared/components/BaseModal';
import { pontosApi, colaboradoresApi } from '../shared/api';
import type { IPonto, IColaborador } from '../types/cadastros';

const emptyForm = (): Omit<IPonto, 'id' | 'colaborador_nome'> => ({
  colaborador_id: '',
  data_registro: '',
  hora_entrada: '',
  hora_saida: '',
  tipo_registro: 'Normal',
  observacao: '',
});

export function PontosPage() {
  const [pontos, setPontos] = useState<IPonto[]>([]);
  const [colaboradores, setColaboradores] = useState<IColaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      pontosApi.listar(),
      colaboradoresApi.listar(),
    ]).then(([ptData, colData]) => {
      if (!cancelled) {
        setPontos(ptData);
        setColaboradores(colData);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setModalOpen(true); };
  const openEdit = (pt: IPonto) => {
    setEditingId(pt.id);
    setForm({
      colaborador_id: pt.colaborador_id,
      data_registro: pt.data_registro?.split('T')[0] || pt.data_registro,
      hora_entrada: pt.hora_entrada || '',
      hora_saida: pt.hora_saida || '',
      tipo_registro: pt.tipo_registro,
      observacao: pt.observacao || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      colaborador_id: form.colaborador_id,
      data_registro: form.data_registro,
      hora_entrada: form.hora_entrada || undefined,
      hora_saida: form.hora_saida || undefined,
      tipo_registro: form.tipo_registro,
      observacao: form.observacao || undefined,
    };
    if (editingId) {
      const updated = await pontosApi.atualizar(editingId, payload);
      setPontos((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
    } else {
      const created = await pontosApi.criar(payload);
      setPontos((prev) => [...prev, created]);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir registro de ponto?')) return;
    await pontosApi.excluir(id);
    setPontos((prev) => prev.filter((p) => p.id !== id));
  };

  const columns: Column<IPonto>[] = [
    { key: 'colaborador_nome', header: 'COLABORADOR' },
    { key: 'data_registro', header: 'DATA' },
    { key: 'hora_entrada', header: 'ENTRADA' },
    { key: 'hora_saida', header: 'SAÍDA' },
    { key: 'tipo_registro', header: 'TIPO' },
    { key: 'observacao', header: 'OBS.' },
    {
      key: 'acoes',
      header: 'AÇÕES',
      render: (item) => (
        <div>
          <button onClick={() => openEdit(item as IPonto)} style={{ marginRight: '0.5rem' }}>Editar</button>
          <button onClick={() => handleDelete((item as IPonto).id)}>Excluir</button>
        </div>
      ),
    },
  ];

  if (loading) return <div style={{ padding: '2rem' }}>Carregando registros de ponto...</div>;

  return (
    <>
      <BaseTable
        title="Controle de Ponto"
        columns={columns}
        data={pontos}
        addLabel="Novo Registro"
        onAdd={openCreate}
      />
      <BaseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Registro' : 'Novo Registro'}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Colaborador</label>
            <select value={form.colaborador_id} onChange={(e) => setForm({ ...form, colaborador_id: e.target.value })} required style={{ width: '100%', padding: '0.5rem' }}>
              <option value="">Selecione...</option>
              {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Data</label>
            <input type="date" value={form.data_registro} onChange={(e) => setForm({ ...form, data_registro: e.target.value })} required style={{ width: '100%', padding: '0.5rem' }} />
          </div>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label>Hora Entrada</label>
              <input type="time" value={form.hora_entrada} onChange={(e) => setForm({ ...form, hora_entrada: e.target.value })} style={{ width: '100%', padding: '0.5rem' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Hora Saída</label>
              <input type="time" value={form.hora_saida} onChange={(e) => setForm({ ...form, hora_saida: e.target.value })} style={{ width: '100%', padding: '0.5rem' }} />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Tipo de Registro</label>
            <select value={form.tipo_registro} onChange={(e) => setForm({ ...form, tipo_registro: e.target.value })} required style={{ width: '100%', padding: '0.5rem' }}>
              <option value="Normal">Normal</option>
              <option value="Extra">Extra</option>
              <option value="Falta">Falta</option>
              <option value="Atestado">Atestado</option>
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Observação</label>
            <textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} rows={3} style={{ width: '100%', padding: '0.5rem' }} />
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

export default PontosPage;

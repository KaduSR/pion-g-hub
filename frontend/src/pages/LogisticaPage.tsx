import { useEffect, useState } from 'react';
import { BaseTable, type Column } from '../components/BaseTable';
import { BaseModal } from '../shared/components/BaseModal';
import { logisticaApi, colaboradoresApi } from '../shared/api';
import type { IOperacaoLogistica, IColaborador } from '../types/cadastros';

const emptyForm = (): Omit<IOperacaoLogistica, 'id' | 'colaborador_nome' | 'created_at'> => ({
  codigo_rastreio: '',
  colaborador_responsavel_id: '',
  origem: '',
  destino: '',
  status_operacao: 'Pendente',
  data_prevista: '',
});

export function LogisticaPage() {
  const [list, setList] = useState<IOperacaoLogistica[]>([]);
  const [colaboradores, setColaboradores] = useState<IColaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([logisticaApi.listar(), colaboradoresApi.listar()]).then(([logData, colData]) => {
      if (!cancelled) { setList(logData); setColaboradores(colData); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setModalOpen(true); };
  const openEdit = (item: IOperacaoLogistica) => {
    setEditingId(item.id);
    setForm({
      codigo_rastreio: item.codigo_rastreio,
      colaborador_responsavel_id: item.colaborador_responsavel_id || '',
      origem: item.origem,
      destino: item.destino,
      status_operacao: item.status_operacao,
      data_prevista: item.data_prevista ? item.data_prevista.split('T')[0] : '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      codigo_rastreio: form.codigo_rastreio,
      colaborador_responsavel_id: form.colaborador_responsavel_id || undefined,
      origem: form.origem,
      destino: form.destino,
      status_operacao: form.status_operacao,
      data_prevista: form.data_prevista || undefined,
    };
    if (editingId) {
      const updated = await logisticaApi.atualizar(editingId, payload);
      setList(prev => prev.map(i => (i.id === editingId ? updated : i)));
    } else {
      const created = await logisticaApi.criar(payload);
      setList(prev => [...prev, created]);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir operação de logística?')) return;
    await logisticaApi.excluir(id);
    setList(prev => prev.filter(i => i.id !== id));
  };

  const columns: Column<IOperacaoLogistica>[] = [
    { key: 'codigo_rastreio', header: 'CÓDIGO' },
    { key: 'colaborador_nome', header: 'RESPONSÁVEL' },
    { key: 'origem', header: 'ORIGEM' },
    { key: 'destino', header: 'DESTINO' },
    { key: 'status_operacao', header: 'STATUS' },
    { key: 'data_prevista', header: 'DATA PREVISTA' },
    {
      key: 'acoes', header: 'AÇÕES',
      render: (item) => (
        <div>
          <button onClick={() => openEdit(item as IOperacaoLogistica)} style={{ marginRight: '0.5rem' }}>Editar</button>
          <button onClick={() => handleDelete((item as IOperacaoLogistica).id)}>Excluir</button>
        </div>
      ),
    },
  ];

  if (loading) return <div style={{ padding: '2rem' }}>Carregando operações de logística...</div>;

  const term = searchText.trim().toLowerCase();
  const filtered = list.filter((item) => {
    if (!term) return true;
    return (
      (item.codigo_rastreio || '').toLowerCase().includes(term) ||
      (item.colaborador_nome || '').toLowerCase().includes(term) ||
      (item.origem || '').toLowerCase().includes(term) ||
      (item.destino || '').toLowerCase().includes(term)
    );
  });

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Pesquisar por código, responsável, origem ou destino..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', padding: '0.5rem', boxSizing: 'border-box' }}
        />
      </div>
      <BaseTable
        title="Logística — Operações"
        columns={columns}
        data={filtered}
        addLabel="Nova Operação"
        onAdd={openCreate}
      />
      <BaseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Operação' : 'Nova Operação'}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}><label>Código de Rastreio</label><input value={form.codigo_rastreio} onChange={e => setForm({ ...form, codigo_rastreio: e.target.value })} required style={{ width: '100%', padding: '0.5rem' }} /></div>
          <div style={{ marginBottom: '1rem' }}><label>Responsável</label><select value={form.colaborador_responsavel_id} onChange={e => setForm({ ...form, colaborador_responsavel_id: e.target.value })} style={{ width: '100%', padding: '0.5rem' }}><option value="">Selecione...</option>{colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          <div style={{ marginBottom: '1rem' }}><label>Origem</label><input value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} required style={{ width: '100%', padding: '0.5rem' }} /></div>
          <div style={{ marginBottom: '1rem' }}><label>Destino</label><input value={form.destino} onChange={e => setForm({ ...form, destino: e.target.value })} required style={{ width: '100%', padding: '0.5rem' }} /></div>
          <div style={{ marginBottom: '1rem' }}><label>Status</label><select value={form.status_operacao} onChange={e => setForm({ ...form, status_operacao: e.target.value })} required style={{ width: '100%', padding: '0.5rem' }}><option>Pendente</option><option>Em Trânsito</option><option>Entregue</option><option>Cancelado</option></select></div>
          <div style={{ marginBottom: '1rem' }}><label>Data Prevista</label><input type="date" value={form.data_prevista} onChange={e => setForm({ ...form, data_prevista: e.target.value })} style={{ width: '100%', padding: '0.5rem' }} /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}><button type="button" onClick={() => setModalOpen(false)}>Cancelar</button><button type="submit">Salvar</button></div>
        </form>
      </BaseModal>
    </>
  );
}

export default LogisticaPage;

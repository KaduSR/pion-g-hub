import { useEffect, useState } from 'react';
import { BaseTable, type Column } from '../components/BaseTable';
import { BaseModal } from '../shared/components/BaseModal';
import { cadastrosService } from '../services/cadastrosService';
import type { IDefeitoRefugo } from '../types/cadastros';
import { useNotify } from '../contexts/NotificationContext';

const emptyForm = (): Omit<IDefeitoRefugo, 'status'> => ({
  codigo: '',
  descricao: '',
  setores_precos: '',
  custo_base: 0,
});

export function DefeitosRefugoPage() {
  const [defeitos, setDefeitos] = useState<IDefeitoRefugo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCodigo, setEditingCodigo] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const notify = useNotify();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cadastrosService.getDefeitosRefugo().then((data) => {
      if (!cancelled) {
        setDefeitos(data);
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
    setEditingCodigo(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (defeito: IDefeitoRefugo) => {
    setEditingCodigo(defeito.codigo);
    setForm({
      codigo: defeito.codigo,
      descricao: defeito.descricao,
      setores_precos: defeito.setores_precos,
      custo_base: defeito.custo_base,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, custo_base: Number(form.custo_base) };
    if (editingCodigo) {
      const updated = await cadastrosService.updateDefeitoRefugo(editingCodigo, payload);
      setDefeitos((prev) => prev.map((d) => (d.codigo === editingCodigo ? updated : d)));
      notify.success('Defeito atualizado com sucesso!');
    } else {
      const created = await cadastrosService.createDefeitoRefugo(payload);
      setDefeitos((prev) => [...prev, created]);
      notify.success('Defeito criado com sucesso!');
    }
    setModalOpen(false);
  };

  const handleDelete = async (codigo: string) => {
    await cadastrosService.deleteDefeitoRefugo(codigo);
    setDefeitos((prev) => prev.filter((d) => d.codigo !== codigo));
    notify.success('Defeito excluido com sucesso!');
  };

  const columns: Column<IDefeitoRefugo>[] = [
    { key: 'codigo', header: 'CÓDIGO' },
    { key: 'descricao', header: 'DESCRICAO' },
    { key: 'setores_precos', header: 'SETORES / PRECOS' },
    { key: 'custo_base', header: 'CUSTO BASE (R$)' },
    { key: 'status', header: 'STATUS' },
    {
      key: 'acoes',
      header: 'AÇÕES',
      render: (item) => (
        <div>
          <button onClick={() => openEdit(item as IDefeitoRefugo)} style={{ marginRight: '0.5rem' }}>
            Editar
          </button>
          <button onClick={() => handleDelete((item as IDefeitoRefugo).codigo)}>Excluir</button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div style={{ padding: '2rem' }}>Carregando defeitos...</div>;
  }

  return (
    <>
      <BaseTable
        title="Defeitos de Refugo"
        columns={columns}
        data={defeitos}
        addLabel="Novo Defeito"
        onAdd={openCreate}
        searchPlaceholder="Pesquisar defeitos..."
        searchKeys={['codigo', 'descricao', 'setores_precos']}
      />
      <BaseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingCodigo ? 'Editar Defeito' : 'Novo Defeito'}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Código</label>
            <input
              type="text"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              required
              disabled={!!editingCodigo}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Descrição</label>
            <input
              type="text"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Setores / Preços</label>
            <input
              type="text"
              value={form.setores_precos}
              onChange={(e) => setForm({ ...form, setores_precos: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Custo Base (R$)</label>
            <input
              type="number"
              step="0.01"
              value={form.custo_base}
              onChange={(e) => setForm({ ...form, custo_base: Number(e.target.value) })}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
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

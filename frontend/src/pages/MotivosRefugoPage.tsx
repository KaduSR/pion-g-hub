import { useEffect, useState } from 'react';
import { BaseTable, type Column } from '../components/BaseTable';
import { BaseModal } from '../shared/components/BaseModal';
import { cadastrosService } from '../services/cadastrosService';
import type { IMotivoRefugo } from '../types/cadastros';

const emptyForm = (): Omit<IMotivoRefugo, 'status'> => ({
  codigo: '',
  descricao: '',
  tipo: '',
});

export function MotivosRefugoPage() {
  const [motivos, setMotivos] = useState<IMotivoRefugo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCodigo, setEditingCodigo] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cadastrosService.getMotivosRefugo().then((data) => {
      if (!cancelled) {
        setMotivos(data);
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

  const openEdit = (motivo: IMotivoRefugo) => {
    setEditingCodigo(motivo.codigo);
    setForm({
      codigo: motivo.codigo,
      descricao: motivo.descricao,
      tipo: motivo.tipo,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCodigo) {
      const updated = await cadastrosService.updateMotivoRefugo(editingCodigo, form);
      setMotivos((prev) => prev.map((m) => (m.codigo === editingCodigo ? updated : m)));
    } else {
      const created = await cadastrosService.createMotivoRefugo(form);
      setMotivos((prev) => [...prev, created]);
    }
    setModalOpen(false);
  };

  const handleDelete = async (codigo: string) => {
    if (!confirm('Deseja realmente excluir este motivo?')) {
      return;
    }
    await cadastrosService.deleteMotivoRefugo(codigo);
    setMotivos((prev) => prev.filter((m) => m.codigo !== codigo));
  };

  const columns: Column<IMotivoRefugo>[] = [
    { key: 'codigo', header: 'CÓDIGO' },
    { key: 'descricao', header: 'DESCRICAO' },
    { key: 'tipo', header: 'TIPO' },
    { key: 'status', header: 'STATUS' },
    {
      key: 'acoes',
      header: 'AÇÕES',
      render: (item) => (
        <div>
          <button onClick={() => openEdit(item as IMotivoRefugo)} style={{ marginRight: '0.5rem' }}>
            Editar
          </button>
          <button onClick={() => handleDelete((item as IMotivoRefugo).codigo)}>Excluir</button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div style={{ padding: '2rem' }}>Carregando motivos...</div>;
  }

  return (
    <>
      <BaseTable
        title="Motivos de Refugo"
        columns={columns}
        data={motivos}
        addLabel="Novo Motivo"
        onAdd={openCreate}
      />
      <BaseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingCodigo ? 'Editar Motivo' : 'Novo Motivo'}>
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
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Tipo</label>
            <input
              type="text"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              required
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

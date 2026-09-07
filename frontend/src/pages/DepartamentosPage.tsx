import { useEffect, useState } from 'react';
import { BaseTable, type Column } from '../components/BaseTable';
import { cadastrosService } from '../services/cadastrosService';
import type { IDepartamento } from '../types/cadastros';

export function DepartamentosPage() {
  const [departamentos, setDepartamentos] = useState<IDepartamento[]>([]);
  const [loading, setLoading] = useState(true);

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

  const columns: Column<IDepartamento>[] = [
    { key: 'descricao', header: 'DESCRICAO' },
    { key: 'descricao_curta', header: 'DESCRICAO CURTA' },
    { key: 'status', header: 'STATUS' },
    {
      key: 'acoes',
      header: 'ACOES',
      render: () => (
        <div>
          <button style={{ marginRight: '0.5rem' }}>Editar</button>
          <button>Excluir</button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div style={{ padding: '2rem' }}>Carregando departamentos...</div>;
  }

  return (
    <BaseTable
      title="Departamentos"
      columns={columns}
      data={departamentos}
      addLabel="Adicionar Departamento"
      onAdd={() => alert('Abrir modal de criacao de departamento')}
    />
  );
}

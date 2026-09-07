import { useEffect, useState } from 'react';
import { BaseTable, type Column } from '../components/BaseTable';
import { cadastrosService } from '../services/cadastrosService';
import type { IArea } from '../types/cadastros';

export function AreasPage() {
  const [areas, setAreas] = useState<IArea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cadastrosService.getAreas().then((data) => {
      if (!cancelled) {
        setAreas(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const columns: Column<IArea>[] = [
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
    return <div style={{ padding: '2rem' }}>Carregando areas...</div>;
  }

  return (
    <BaseTable
      title="Areas"
      columns={columns}
      data={areas}
      addLabel="Adicionar Area"
      onAdd={() => alert('Abrir modal de criacao de area')}
    />
  );
}

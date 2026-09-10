import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BaseTable, type Column } from '../components/BaseTable';

interface Item {
  id: string;
  nome: string;
  matricula: string;
}

const columns: Column<Item>[] = [
  { key: 'nome', header: 'Nome' },
  { key: 'matricula', header: 'Matrícula' },
];

const data: Item[] = [
  { id: '1', nome: 'João Silva', matricula: '123' },
  { id: '2', nome: 'Maria Oliveira', matricula: '456' },
  { id: '3', nome: 'Pedro Souza', matricula: '789' },
];

describe('BaseTable', () => {
  it('renders table headers', () => {
    render(<BaseTable columns={columns} data={data} />);
    expect(screen.getByText('Nome')).toBeDefined();
    expect(screen.getByText('Matrícula')).toBeDefined();
  });

  it('renders provided data rows', () => {
    render(<BaseTable columns={columns} data={data} />);
    expect(screen.getByText('João Silva')).toBeDefined();
    expect(screen.getByText('Maria Oliveira')).toBeDefined();
    expect(screen.getByText('Pedro Souza')).toBeDefined();
  });

  it('renders empty state when data is empty', () => {
    render(<BaseTable columns={columns} data={[]} />);
    expect(screen.getByText('Nenhum registro cadastrado')).toBeDefined();
  });

  it('filters data by search text', () => {
    render(
      <BaseTable
        columns={columns}
        data={data}
        searchPlaceholder="Buscar"
        searchKeys={['nome', 'matricula']}
      />
    );

    const input = screen.getByPlaceholderText('Buscar') as HTMLInputElement;
    expect(input.value).toBe('');

    fireEvent.input(input, { target: { value: 'Maria' } });

    expect(screen.getByText('Maria Oliveira')).toBeDefined();
    expect(screen.queryByText('João Silva')).toBeNull();
  });

  it('shows title and add button when provided', () => {
    render(
      <BaseTable
        columns={columns}
        data={data}
        title="Colaboradores"
        onAdd={() => {}}
        addLabel="Novo"
      />
    );
    expect(screen.getByText('Colaboradores')).toBeDefined();
    expect(screen.getByText('Novo')).toBeDefined();
  });
});

import React from 'react'
import { Search } from 'lucide-react'
import { Input, Select } from '../../../shared/components/FormField'

// Rótulos alinhados aos cartões de TicketStats.jsx (mesmas chaves de
// STATUS_BUCKETS em ticketsService.js) — "Aguardando atendimento"/"Em
// atendimento" substituem "Abertos"/"Em andamento" pra usar a mesma
// linguagem em toda a tela.
const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'aberto', label: 'Aguardando atendimento' },
  { key: 'andamento', label: 'Em atendimento' },
  { key: 'concluido', label: 'Concluídos' },
]

const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'updated', label: 'Última atualização' },
]

/**
 * Seção 4 (filtros Todos/Abertos/Em andamento/Concluídos) + sugestões 13
 * (busca por número/título) e 14 (ordenação) da especificação.
 */
export function TicketFilters({ filter, onFilterChange, search, onSearchChange, sort, onSortChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            style={{
              padding: '7px 14px',
              borderRadius: 20,
              border: '1.5px solid',
              borderColor: filter === key ? '#1B3A6B' : '#e2e8f0',
              background: filter === key ? '#1B3A6B' : '#fff',
              color: filter === key ? '#fff' : '#475569',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <Input
          placeholder="Buscar por número ou título..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
      </div>

      <Select value={sort} onChange={(e) => onSortChange(e.target.value)} style={{ width: 'auto', minWidth: 170 }}>
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </Select>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input, Select } from '../../../shared/components/FormField'
import { ticketsService } from '../services/ticketsService'

// Só os status alcançáveis nesta sprint — "aguardando_solicitante" fica de
// fora (nenhuma ação da interface leva um chamado até lá ainda, mesmo já
// existindo na máquina de estados). "em_atendimento" passou a ser
// alcançável na revisão de fluxo (Atribuído → Em atendimento via "Iniciar
// atendimento", sem depender de ti_iniciar_tempo/cronômetro).
const STATUS_OPTIONS = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_triagem', label: 'Em triagem' },
  { value: 'atribuido', label: 'Atribuído' },
  { value: 'em_atendimento', label: 'Em atendimento' },
  { value: 'resolvido', label: 'Resolvido' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'reaberto', label: 'Reaberto' },
  { value: 'cancelado', label: 'Cancelado' },
]

const PRIORIDADE_OPTIONS = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

/**
 * Filtros da fila operacional — todos opcionais, refletem 1:1 os
 * parâmetros de ti_fila_atendimento(). O filtro de "responsável" só fica
 * habilitado depois que uma equipe é escolhida (ti_listar_membros_equipe
 * exige p_equipe_id — não existe "listar responsáveis de todas as
 * equipes" nesta sprint).
 */
export function ServiceQueueFilters({ filters, onChange }) {
  const [teams, setTeams] = useState([])
  const [categories, setCategories] = useState([])
  const [members, setMembers] = useState([])

  useEffect(() => {
    ticketsService.getTeams().then(setTeams).catch(() => setTeams([]))
    ticketsService.getCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (!filters.equipeId) {
      setMembers([])
      return
    }
    ticketsService.getTeamMembers(filters.equipeId).then(setMembers).catch(() => setMembers([]))
  }, [filters.equipeId])

  const handleEquipeChange = (equipeId) => {
    // Trocar de equipe invalida o responsável selecionado (ele pertence à
    // equipe anterior).
    onChange({ equipeId, responsavelProfileId: '' })
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
      <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <Input
          placeholder="Buscar por número, título ou solicitante..."
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          style={{ paddingLeft: 36 }}
        />
      </div>

      <Select value={filters.equipeId} onChange={(e) => handleEquipeChange(e.target.value)} style={{ width: 'auto', minWidth: 150 }}>
        <option value="">Todas as equipes</option>
        {teams.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </Select>

      <Select value={filters.status} onChange={(e) => onChange({ status: e.target.value })} style={{ width: 'auto', minWidth: 140 }}>
        <option value="">Todos os status</option>
        {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </Select>

      <Select value={filters.prioridade} onChange={(e) => onChange({ prioridade: e.target.value })} style={{ width: 'auto', minWidth: 130 }}>
        <option value="">Toda prioridade</option>
        {PRIORIDADE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </Select>

      <Select value={filters.categoriaId} onChange={(e) => onChange({ categoriaId: e.target.value })} style={{ width: 'auto', minWidth: 160 }}>
        <option value="">Toda categoria</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </Select>

      <Select
        value={filters.responsavelProfileId}
        onChange={(e) => onChange({ responsavelProfileId: e.target.value })}
        disabled={!filters.equipeId}
        style={{ width: 'auto', minWidth: 160, opacity: filters.equipeId ? 1 : 0.6 }}
        title={filters.equipeId ? undefined : 'Selecione uma equipe para filtrar por responsável'}
      >
        <option value="">{filters.equipeId ? 'Todo responsável' : 'Escolha uma equipe...'}</option>
        {members.map((m) => <option key={m.profile_id} value={m.profile_id}>{m.nome}</option>)}
      </Select>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        <input
          type="checkbox"
          checked={filters.semResponsavel}
          onChange={(e) => onChange({ semResponsavel: e.target.checked })}
        />
        Sem responsável
      </label>
    </div>
  )
}

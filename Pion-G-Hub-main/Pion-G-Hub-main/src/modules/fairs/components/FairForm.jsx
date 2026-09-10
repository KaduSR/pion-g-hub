import React, { useState, useEffect } from 'react'
import { FormField, Input, Select, Textarea, Button } from '../../../shared/components/FormField'
import { ESTADOS_BR, STATUS_FAIR } from '../../../shared/utils/constants'
import { fairsService } from '../services/fairsService'

const EMPTY = {
  nome: '', cidade: '', estado: '', data_inicio: '', data_fim: '',
  responsavel: '', observacoes: '', status: 'Planejada',
}

export function FairForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm]     = useState(initial || EMPTY)
  const [errors, setErrors] = useState({})
  const [availableMembers, setAvailableMembers] = useState([])
  const [selectedTeam, setSelectedTeam] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  useEffect(() => { 
    setForm(initial || EMPTY)
    setErrors({}) 
    setSelectedTeam([])
  }, [initial])

  useEffect(() => {
    let mounted = true
    async function loadMembers() {
      setLoadingMembers(true)
      try {
        const members = await fairsService.getAvailableTeamMembers()
        if (mounted) setAvailableMembers(members)
        
        if (initial?.id) {
          const teamIds = await fairsService.getFairTeam(initial.id)
          if (mounted) setSelectedTeam(teamIds)
        }
      } catch (e) {
        console.error('Falha ao carregar equipe:', e)
      } finally {
        if (mounted) setLoadingMembers(false)
      }
    }
    loadMembers()
    return () => { mounted = false }
  }, [initial])

  const toggleMember = (id) => {
    setSelectedTeam((prev) => 
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.nome.trim())       e.nome       = 'Nome obrigatório'
    if (!form.cidade.trim())     e.cidade     = 'Cidade obrigatória'
    if (!form.estado)            e.estado     = 'Estado obrigatório'
    if (!form.data_inicio)       e.data_inicio = 'Data de início obrigatória'
    if (!form.data_fim)          e.data_fim   = 'Data de término obrigatória'
    if (form.data_inicio && form.data_fim && form.data_fim < form.data_inicio)
      e.data_fim = 'Data de término deve ser após a de início'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({ ...form, responsavel: 'Pion G Plus', equipe: selectedTeam })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <FormField label="Nome da Feira" required error={errors.nome} style={{ gridColumn: '1 / -1' }}>
          <Input value={form.nome} onChange={set('nome')} placeholder="Ex: Hospitalar 2025" error={errors.nome} />
        </FormField>

        <FormField label="Cidade" required error={errors.cidade}>
          <Input value={form.cidade} onChange={set('cidade')} placeholder="Cidade" error={errors.cidade} />
        </FormField>

        <FormField label="Estado" required error={errors.estado}>
          <Select value={form.estado} onChange={set('estado')} error={errors.estado}>
            <option value="">Selecione</option>
            {ESTADOS_BR.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>

        <FormField label="Data de Início" required error={errors.data_inicio}>
          <Input type="date" value={form.data_inicio} onChange={set('data_inicio')} error={errors.data_inicio} />
        </FormField>

        <FormField label="Data de Término" required error={errors.data_fim}>
          <Input type="date" value={form.data_fim} onChange={set('data_fim')} error={errors.data_fim} />
        </FormField>

        <FormField label="Status" style={{ gridColumn: '1 / -1' }}>
          <Select value={form.status} onChange={set('status')}>
            {STATUS_FAIR.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>

        <FormField label="Observações" style={{ gridColumn: '1 / -1' }}>
          <Textarea value={form.observacoes} onChange={set('observacoes')} placeholder="Observações opcionais…" />
        </FormField>
      </div>

      <div style={{ marginTop: 16 }}>
        <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#334155' }}>Equipe da Feira</h4>
        {loadingMembers ? (
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Carregando membros...</div>
        ) : (
          <div style={{ 
            maxHeight: 150, overflowY: 'auto', border: '1px solid #e2e8f0', 
            borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 
          }}>
            {availableMembers.length === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8' }}>Nenhum usuário ativo disponível.</div>
            ) : (
              availableMembers.map(member => (
                <label key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedTeam.includes(member.id)}
                    onChange={() => toggleMember(member.id)}
                  />
                  <span>{member.name} <span style={{ color: '#94a3b8', fontSize: 12 }}>({member.role})</span></span>
                </label>
              ))
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {initial ? 'Salvar alterações' : 'Criar Feira'}
        </Button>
      </div>
    </form>
  )
}

import React from 'react'
import { Badge } from '../../../shared/components/Badge'

// Mapeia os 9 status possíveis de ti_chamados (seção 3 do doc de
// arquitetura) pro rótulo/cor exibidos ao solicitante. "Concluído" (não
// "Resolvido"/"Fechado" separados) porque a diferença entre os dois não é
// relevante pro solicitante nesta sprint — os dois significam "terminou".
const STATUS_MAP = {
  aberto:                 { label: 'Aberto',           color: '#2563eb', bg: '#eff6ff' },
  em_triagem:             { label: 'Em triagem',       color: '#d97706', bg: '#fffbeb' },
  atribuido:              { label: 'Atribuído',        color: '#d97706', bg: '#fffbeb' },
  em_atendimento:         { label: 'Em andamento',     color: '#2563eb', bg: '#eff6ff' },
  aguardando_solicitante: { label: 'Aguardando você',  color: '#7c3aed', bg: '#f5f3ff' },
  resolvido:              { label: 'Concluído',        color: '#059669', bg: '#ecfdf5' },
  fechado:                { label: 'Concluído',        color: '#059669', bg: '#ecfdf5' },
  reaberto:               { label: 'Reaberto',         color: '#dc2626', bg: '#fef2f2' },
  cancelado:              { label: 'Cancelado',        color: '#64748b', bg: '#f1f5f9' },
}

// Central de Atendimento (Sprint 4.3): quem opera TI precisa distinguir
// Resolvido de Fechado (não são a mesma coisa operacionalmente — Fechado é
// terminal, Resolvido ainda pode ser reaberto). variant="operacional" troca
// só esses dois rótulos; os demais status reaproveitam STATUS_MAP.
const STATUS_MAP_OPERACIONAL = {
  ...STATUS_MAP,
  resolvido: { label: 'Resolvido', color: '#059669', bg: '#ecfdf5' },
  fechado: { label: 'Fechado', color: '#475569', bg: '#f1f5f9' },
}

// `overrideLabel`: troca só o TEXTO exibido, nunca o valor de `status`
// recebido nem a cor/fundo do mapa — usado pela Central de Atendimento pra
// comunicar "Aguardando atribuição" quando em_triagem já tem equipe mas
// ainda não tem responsável (o status interno continua 'em_triagem', só a
// leitura do rótulo muda; ver TicketDetails.jsx).
export function TicketStatusBadge({ status, variant = 'solicitante', overrideLabel }) {
  const map = variant === 'operacional' ? STATUS_MAP_OPERACIONAL : STATUS_MAP
  const { label, color, bg } = map[status] || { label: status, color: '#64748b', bg: '#f1f5f9' }
  return <Badge color={color} bg={bg}>{overrideLabel || label}</Badge>
}

// Priordade (Baixa/Média/Alta/Urgente) reaproveita o mesmo Badge — sem
// arquivo próprio (não listado na estrutura da sprint), só uma segunda
// exportação aqui do lado do status.
const PRIORIDADE_MAP = {
  baixa:   { label: 'Baixa',   color: '#64748b', bg: '#f1f5f9' },
  media:   { label: 'Média',   color: '#2563eb', bg: '#eff6ff' },
  alta:    { label: 'Alta',    color: '#d97706', bg: '#fffbeb' },
  urgente: { label: 'Urgente', color: '#dc2626', bg: '#fef2f2' },
}

export function TicketPriorityBadge({ prioridade }) {
  const { label, color, bg } = PRIORIDADE_MAP[prioridade] || { label: prioridade, color: '#64748b', bg: '#f1f5f9' }
  return <Badge color={color} bg={bg}>{label}</Badge>
}

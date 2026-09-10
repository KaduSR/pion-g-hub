import React from 'react'

/**
 * Alterna entre "Minhas solicitações" (chamados que o usuário abriu como
 * solicitante) e "Central de Atendimento" (área operacional da TI) dentro
 * da mesma rota /ti — evita duplicar rota/tela só pra trocar de visão.
 * Cada aba só aparece pra quem tem acesso à visão correspondente
 * (TicketsDashboard.jsx decide isso — Central usa a regra de PBAC + vínculo
 * ativo em equipe de useCentralAtendimentoAccess, não só permissão); se só
 * uma das duas se aplica, não faz sentido mostrar abas pra uma escolha só —
 * a tela renderiza direto a visão disponível, sem aba nenhuma.
 *
 * "Minhas solicitações" nunca vira "Meus atendimentos" — são conceitos
 * diferentes (quem abriu o chamado vs. quem foi atribuído a ele) e não
 * devem se misturar nesta aba.
 */
export function TicketsViewTabs({ view, onChange, showSolicitacoes, showCentral }) {
  if (!showSolicitacoes || !showCentral) return null

  const TABS = [
    { key: 'solicitacoes', label: 'Minhas solicitações' },
    { key: 'central', label: 'Central de Atendimento' },
  ]

  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1.5px solid #e2e8f0' }}>
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontSize: 14,
            fontWeight: 700,
            color: view === tab.key ? '#1B3A6B' : '#94a3b8',
            borderBottom: view === tab.key ? '2.5px solid #1B3A6B' : '2.5px solid transparent',
            marginBottom: -1.5,
            cursor: 'pointer',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

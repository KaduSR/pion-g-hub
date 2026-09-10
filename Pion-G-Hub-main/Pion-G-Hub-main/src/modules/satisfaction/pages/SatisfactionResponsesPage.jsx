import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Eye } from 'lucide-react'
import { useFairsContext } from '../../fairs/contexts/FairsContext'
import { satisfactionService } from '../services/satisfactionService'
import { SatisfactionResponseDetailsModal } from '../components/SatisfactionResponseDetailsModal'
import { Select, Input, Button } from '../../../shared/components/FormField'
import { useToast } from '../../../shared/components/Toast'

const PAGE_SIZE = 25

const th = {
  padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
}
const td = {
  padding: '12px 16px', fontSize: 14, color: '#475569',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
}
const emptyCell = { padding: 32, textAlign: 'center', color: '#94a3b8' }

// A coluna Ação nunca deve truncar o botão: sobrescreve o overflow/ellipsis/
// nowrap herdados de th/td só aqui, onde o objetivo é o oposto (mostrar o
// botão inteiro), nunca cortando conteúdo.
const actionCol = { textAlign: 'center', overflow: 'visible', textOverflow: 'unset', whiteSpace: 'normal' }

// Ação discreta de linha, estilo ERP (Omie/Bling/Conta Azul): ícone + texto
// na cor azul do sistema, sem preenchimento, só um leve highlight no hover —
// não deve competir visualmente com os dados da resposta.
const viewButtonStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '6px 10px', borderRadius: 8, border: 'none',
  background: 'transparent', color: '#1B3A6B',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  transition: 'background 0.15s',
}

/**
 * Central de consulta/auditoria das respostas — separada de /pesquisas
 * (que fica focada em configuração) pra não virar uma tela gigante quando
 * o volume de respostas crescer. Aceita ?feiraId= e/ou ?pesquisaId= na URL
 * pra abrir já filtrada (usado pelo botão "Ver todas as respostas" de
 * /pesquisas), mas depois disso os filtros só vivem em estado local.
 */
export function SatisfactionResponsesPage() {
  const [searchParams] = useSearchParams()
  const { allFairs } = useFairsContext()
  const { show: showToast, ToastEl } = useToast()

  const [feiraId, setFeiraId] = useState(searchParams.get('feiraId') || '')
  const [pesquisaId, setPesquisaId] = useState(searchParams.get('pesquisaId') || '')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [pesquisaOptions, setPesquisaOptions] = useState([])
  const [responses, setResponses] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedResponseId, setSelectedResponseId] = useState(null)

  // Debounce simples da busca textual — evita disparar uma query a cada tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // Opções de pesquisa dependem da feira selecionada.
  useEffect(() => {
    satisfactionService.getPesquisasFilterOptions(feiraId || null)
      .then(setPesquisaOptions)
      .catch(() => setPesquisaOptions([]))
  }, [feiraId])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await satisfactionService.getResponsesList({
        feiraId: feiraId || null,
        pesquisaId: pesquisaId || null,
        search,
        page,
        pageSize: PAGE_SIZE,
      })
      setResponses(result.data)
      setCount(result.count)
    } catch (err) {
      setError('Não foi possível carregar as respostas. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [feiraId, pesquisaId, search, page])

  useEffect(() => { load() }, [load])

  const handleFeiraChange = (e) => {
    setFeiraId(e.target.value)
    setPesquisaId('') // pesquisa selecionada pode não pertencer à nova feira
    setPage(1)
  }

  const handlePesquisaChange = (e) => {
    setPesquisaId(e.target.value)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      {ToastEl}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a', fontFamily: 'Space Grotesk, sans-serif' }}>
          Respostas da Pesquisa de Satisfação
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          Consulte e audite as respostas recebidas de visitantes.
        </p>
      </div>

      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24,
        background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0',
      }}>
        <div style={{ minWidth: 200 }}>
          <Select value={feiraId} onChange={handleFeiraChange}>
            <option value="">Todas as feiras</option>
            {allFairs.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </Select>
        </div>

        <div style={{ minWidth: 220 }}>
          <Select value={pesquisaId} onChange={handlePesquisaChange}>
            <option value="">Todas as pesquisas</option>
            {pesquisaOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {feiraId ? p.titulo : `${p.titulo} — ${p.feiras?.nome || 'Sem feira'}`}
              </option>
            ))}
          </Select>
        </div>

        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome, empresa, e-mail ou telefone"
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {/* table-layout fixed + larguras em % somando 100%: a tabela sempre
              ocupa 100% do container, sem depender de scroll horizontal.
              Conteúdo longo trunca com "..." e mostra o valor completo no
              title (tooltip) em vez de alargar a coluna. */}
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left' }}>
            <colgroup>
              <col style={{ width: '18%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={th}>Nome</th>
                <th style={th}>Empresa</th>
                <th style={th}>E-mail</th>
                <th style={th}>Telefone</th>
                <th style={th}>Feira</th>
                <th style={{ ...th, ...actionCol }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={emptyCell}>Carregando respostas...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} style={{ ...emptyCell, color: '#dc2626' }}>{error}</td></tr>
              ) : responses.length === 0 ? (
                <tr><td colSpan={6} style={emptyCell}>Nenhuma resposta encontrada para os filtros selecionados.</td></tr>
              ) : (
                responses.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...td, fontWeight: 500, color: '#0f172a' }} title={r.respondente_nome || ''}>
                      {r.respondente_nome || 'Não informado'}
                    </td>
                    <td style={td} title={r.respondente_empresa || ''}>{r.respondente_empresa || 'Não informado'}</td>
                    <td style={td} title={r.respondente_email || ''}>{r.respondente_email || 'Não informado'}</td>
                    <td style={td} title={r.respondente_telefone || ''}>{r.respondente_telefone || 'Não informado'}</td>
                    <td style={td} title={r.feiras?.nome || ''}>{r.feiras?.nome || 'Não informado'}</td>
                    <td style={{ ...td, ...actionCol }}>
                      <button
                        type="button"
                        onClick={() => setSelectedResponseId(r.id)}
                        style={viewButtonStyle}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#eef2ff' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <Eye size={14} /> Visualizar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && !error && count > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Anterior
          </Button>
          <span style={{ fontSize: 13, color: '#64748b' }}>Página {page} de {totalPages}</span>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            Próxima
          </Button>
        </div>
      )}

      <SatisfactionResponseDetailsModal
        responseId={selectedResponseId}
        isOpen={!!selectedResponseId}
        onClose={() => setSelectedResponseId(null)}
        showToast={showToast}
      />
    </div>
  )
}

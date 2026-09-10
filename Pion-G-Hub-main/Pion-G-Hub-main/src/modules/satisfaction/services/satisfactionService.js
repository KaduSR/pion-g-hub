import { supabase } from '../../../lib/supabase'
import { DEFAULT_TEMPLATE_QUESTIONS, classifySatisfaction } from '../constants/satisfactionDefaults'

const PESQUISAS = 'pesquisas_satisfacao'
const PERGUNTAS = 'pesquisa_satisfacao_perguntas'
const RESPOSTAS = 'pesquisa_satisfacao_respostas'

async function hasResponses(pesquisaId) {
  const { count, error } = await supabase
    .from(RESPOSTAS)
    .select('id', { count: 'exact', head: true })
    .eq('pesquisa_id', pesquisaId)
  if (error) throw error
  return (count || 0) > 0
}

async function assertNoResponses(pesquisaId) {
  if (await hasResponses(pesquisaId)) {
    throw new Error('Esta pesquisa já possui respostas — não é possível alterar a estrutura das perguntas. Duplique a pesquisa para criar uma nova versão.')
  }
}

export const satisfactionService = {
  hasResponses,

  /** Lista as pesquisas de uma feira, mais recentes primeiro. */
  async getByFeira(feiraId) {
    const { data, error } = await supabase
      .from(PESQUISAS)
      .select('*')
      .eq('feira_id', feiraId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase.from(PESQUISAS).select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  async listQuestions(pesquisaId) {
    const { data, error } = await supabase
      .from(PERGUNTAS)
      .select('*')
      .eq('pesquisa_id', pesquisaId)
      .order('ordem', { ascending: true })
    if (error) throw error
    return data
  },

  /**
   * Cria a pesquisa e, se `useTemplate`, já insere as perguntas do modelo
   * padrão Pion G Plus (constants/satisfactionDefaults.js) na mesma ordem.
   */
  async create({ feiraId, titulo, descricao, useTemplate, createdBy }) {
    const { data: pesquisa, error } = await supabase
      .from(PESQUISAS)
      .insert({
        feira_id: feiraId,
        public_token: crypto.randomUUID(),
        titulo,
        descricao: descricao || null,
        created_by: createdBy || null,
      })
      .select()
      .single()
    if (error) throw error

    if (useTemplate) {
      const rows = DEFAULT_TEMPLATE_QUESTIONS.map((q, index) => ({
        pesquisa_id: pesquisa.id,
        ordem: index,
        titulo: q.titulo,
        descricao: q.descricao || null,
        tipo: q.tipo,
        obrigatoria: q.obrigatoria,
        opcoes: q.opcoes || null,
        metric_key: q.metric_key || null,
      }))
      const { error: insertError } = await supabase.from(PERGUNTAS).insert(rows)
      if (insertError) throw insertError
    }

    return pesquisa
  },

  /** Título/descrição podem sempre ser editados — a trava é só estrutural (perguntas). */
  async update(id, { titulo, descricao }) {
    const { data, error } = await supabase
      .from(PESQUISAS)
      .update({ titulo, descricao: descricao || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async toggleActive(id, ativa) {
    const { data, error } = await supabase
      .from(PESQUISAS)
      .update({ ativa, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Duplica pesquisa + perguntas (nunca respostas) — vira a "nova versão" quando a original já tem respostas. */
  async duplicate(id, createdBy) {
    const original = await this.getById(id)
    const questions = await this.listQuestions(id)

    const created = await this.create({
      feiraId: original.feira_id,
      titulo: `${original.titulo} (cópia)`,
      descricao: original.descricao,
      useTemplate: false,
      createdBy,
    })

    if (questions.length > 0) {
      const rows = questions.map((q) => ({
        pesquisa_id: created.id,
        ordem: q.ordem,
        titulo: q.titulo,
        descricao: q.descricao,
        tipo: q.tipo,
        obrigatoria: q.obrigatoria,
        opcoes: q.opcoes,
        ativa: q.ativa,
        metric_key: q.metric_key,
      }))
      const { error } = await supabase.from(PERGUNTAS).insert(rows)
      if (error) throw error
    }

    return created
  },

  async createQuestion(pesquisaId, payload) {
    await assertNoResponses(pesquisaId)
    const { titulo, descricao, tipo, obrigatoria, opcoes, ordem } = payload
    const { data, error } = await supabase
      .from(PERGUNTAS)
      .insert({
        pesquisa_id: pesquisaId,
        titulo,
        descricao: descricao || null,
        tipo,
        obrigatoria,
        opcoes: tipo === 'single_choice' ? (opcoes || []) : null,
        ordem: ordem ?? 0,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateQuestion(questionId, payload) {
    const { data: question, error: fetchError } = await supabase
      .from(PERGUNTAS)
      .select('pesquisa_id')
      .eq('id', questionId)
      .single()
    if (fetchError) throw fetchError
    await assertNoResponses(question.pesquisa_id)

    const { titulo, descricao, tipo, obrigatoria, opcoes, ativa } = payload
    const { data, error } = await supabase
      .from(PERGUNTAS)
      .update({
        titulo,
        descricao: descricao || null,
        tipo,
        obrigatoria,
        opcoes: tipo === 'single_choice' ? (opcoes || []) : null,
        ativa,
        updated_at: new Date().toISOString(),
      })
      .eq('id', questionId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteQuestion(questionId) {
    const { data: question, error: fetchError } = await supabase
      .from(PERGUNTAS)
      .select('pesquisa_id')
      .eq('id', questionId)
      .single()
    if (fetchError) throw fetchError
    await assertNoResponses(question.pesquisa_id)

    const { error } = await supabase.from(PERGUNTAS).delete().eq('id', questionId)
    if (error) throw error
  },

  /** Substitui a ordem de todas as perguntas de uma vez (drag/drop ou botões subir/descer). */
  async reorderQuestions(pesquisaId, orderedIds) {
    await assertNoResponses(pesquisaId)
    await Promise.all(
      orderedIds.map((id, index) =>
        supabase.from(PERGUNTAS).update({ ordem: index }).eq('id', id)
      )
    )
  },

  async getResponses(pesquisaId, { limit = 20 } = {}) {
    const { data, error } = await supabase
      .from(RESPOSTAS)
      .select('*')
      .eq('pesquisa_id', pesquisaId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },

  /**
   * Lista paginada de respostas para a Central de Respostas (/pesquisas/respostas).
   * Filtra por feira/pesquisa e busca textual (ilike) em nome/empresa/e-mail/telefone.
   */
  async getResponsesList({ feiraId, pesquisaId, search, page = 1, pageSize = 25 } = {}) {
    let query = supabase
      .from(RESPOSTAS)
      .select('*, pesquisas_satisfacao(titulo), feiras(nome)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (feiraId) query = query.eq('feira_id', feiraId)
    if (pesquisaId) query = query.eq('pesquisa_id', pesquisaId)

    const term = search?.trim()
    if (term) {
      query = query.or(
        `respondente_nome.ilike.%${term}%,respondente_empresa.ilike.%${term}%,respondente_email.ilike.%${term}%,respondente_telefone.ilike.%${term}%`
      )
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw error
    return { data, count: count || 0 }
  },

  /**
   * Pesquisas disponíveis para o filtro da Central de Respostas. Sem
   * feiraId, retorna de todas as feiras (com o nome da feira embutido,
   * pra desambiguar pesquisas de mesmo título em feiras diferentes).
   */
  async getPesquisasFilterOptions(feiraId) {
    let query = supabase
      .from(PESQUISAS)
      .select('id, titulo, feira_id, feiras(nome)')
      .order('titulo', { ascending: true })
    if (feiraId) query = query.eq('feira_id', feiraId)
    const { data, error } = await query
    if (error) throw error
    return data
  },

  /**
   * Detalhe completo de uma resposta: dados do respondente + todas as
   * perguntas da pesquisa (respondidas ou não) na ordem correta. Feito em
   * 3 consultas simples (resposta, perguntas, itens) em vez de um join
   * único — mais fácil de ler e de garantir que perguntas sem resposta
   * também apareçam ("Não respondido").
   */
  async getResponseDetails(responseId) {
    const { data: resposta, error: respostaError } = await supabase
      .from(RESPOSTAS)
      .select('*, pesquisas_satisfacao(titulo), feiras(nome)')
      .eq('id', responseId)
      .single()
    if (respostaError) throw respostaError

    const [{ data: perguntas, error: perguntasError }, { data: itens, error: itensError }] = await Promise.all([
      supabase
        .from(PERGUNTAS)
        .select('id, ordem, titulo, descricao, tipo, metric_key')
        .eq('pesquisa_id', resposta.pesquisa_id)
        .order('ordem', { ascending: true }),
      supabase
        .from('pesquisa_satisfacao_resposta_itens')
        .select('*')
        .eq('resposta_id', responseId),
    ])
    if (perguntasError) throw perguntasError
    if (itensError) throw itensError

    const itensPorPergunta = Object.fromEntries((itens || []).map((i) => [i.pergunta_id, i]))

    const itensCompletos = (perguntas || []).map((pergunta) => {
      const item = itensPorPergunta[pergunta.id]
      return {
        pergunta_id: pergunta.id,
        ordem: pergunta.ordem,
        titulo: pergunta.titulo,
        descricao: pergunta.descricao,
        tipo: pergunta.tipo,
        metric_key: pergunta.metric_key,
        valor_texto: item?.valor_texto ?? null,
        valor_numero: item?.valor_numero ?? null,
        valor_opcao: item?.valor_opcao ?? null,
        valor_json: item?.valor_json ?? null,
      }
    })

    return {
      id: resposta.id,
      created_at: resposta.created_at,
      respondente_nome: resposta.respondente_nome,
      respondente_empresa: resposta.respondente_empresa,
      respondente_cargo: resposta.respondente_cargo,
      respondente_telefone: resposta.respondente_telefone,
      respondente_email: resposta.respondente_email,
      feira_nome: resposta.feiras?.nome || null,
      pesquisa_titulo: resposta.pesquisas_satisfacao?.titulo || null,
      itens: itensCompletos,
    }
  },

  /**
   * Resumo de satisfação de UMA pesquisa específica (usado na página
   * /pesquisas). Mesma lógica de cálculo do resumo do Dashboard, só que
   * filtrando por pesquisa_id em vez de feira_id.
   */
  async getSurveySummary(pesquisaId) {
    const { count: totalRespostas, error: countError } = await supabase
      .from(RESPOSTAS)
      .select('id', { count: 'exact', head: true })
      .eq('pesquisa_id', pesquisaId)
    if (countError) throw countError

    const { data: itens, error: itensError } = await supabase
      .from('pesquisa_satisfacao_resposta_itens')
      .select('valor_numero, pesquisa_satisfacao_perguntas!inner(tipo), pesquisa_satisfacao_respostas!inner(pesquisa_id)')
      .eq('pesquisa_satisfacao_respostas.pesquisa_id', pesquisaId)
      .in('pesquisa_satisfacao_perguntas.tipo', ['rating_1_5', 'nps_0_10'])
      .not('valor_numero', 'is', null)
    if (itensError) throw itensError

    return summarizeItens(itens, totalRespostas)
  },

  /**
   * Números para o bloco "Satisfação dos Visitantes" do Dashboard Geral.
   * Sem feiraId, considera todas as feiras.
   */
  async getSatisfactionDashboardSummary({ feiraId } = {}) {
    let respostasQuery = supabase.from(RESPOSTAS).select('id', { count: 'exact', head: true })
    if (feiraId) respostasQuery = respostasQuery.eq('feira_id', feiraId)
    const { count: totalRespostas, error: countError } = await respostasQuery
    if (countError) throw countError

    let itensQuery = supabase
      .from('pesquisa_satisfacao_resposta_itens')
      .select('valor_numero, pesquisa_satisfacao_perguntas!inner(tipo), pesquisa_satisfacao_respostas!inner(feira_id)')
      .in('pesquisa_satisfacao_perguntas.tipo', ['rating_1_5', 'nps_0_10'])
      .not('valor_numero', 'is', null)
    if (feiraId) itensQuery = itensQuery.eq('pesquisa_satisfacao_respostas.feira_id', feiraId)

    const { data: itens, error: itensError } = await itensQuery
    if (itensError) throw itensError

    return summarizeItens(itens, totalRespostas)
  },

  // ── Fluxo público (RPC, sem autenticação) ───────────────────────────────

  async getPublicSurvey(publicToken) {
    const { data, error } = await supabase.rpc('get_public_satisfaction_survey', {
      p_public_token: publicToken,
    })
    if (error) throw new Error(error.message)
    return data
  },

  async submitResponse(publicToken, respondent, answers) {
    const { data, error } = await supabase.rpc('submit_satisfaction_survey_response', {
      p_public_token: publicToken,
      p_respondent: respondent,
      p_answers: answers,
    })
    if (error) throw new Error(error.message)
    return data
  },
}

function summarizeItens(itens, totalRespostas) {
  const ratings = []
  const nps = []
  for (const item of itens || []) {
    const tipo = item.pesquisa_satisfacao_perguntas?.tipo
    const valor = Number(item.valor_numero)
    if (tipo === 'rating_1_5') ratings.push(valor)
    else if (tipo === 'nps_0_10') nps.push(valor)
  }

  const mediaRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null
  const npsMedio = nps.length ? nps.reduce((a, b) => a + b, 0) / nps.length : null

  return {
    totalRespostas: totalRespostas || 0,
    mediaRating,
    npsMedio,
    classificacao: classifySatisfaction(mediaRating),
  }
}

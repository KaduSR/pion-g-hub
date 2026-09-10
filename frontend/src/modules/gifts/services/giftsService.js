import { supabase } from '../../../lib/supabase'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '../constants/giftConstants'

const TABLE = 'brindes'
const IMAGE_BUCKET = 'assets'
const IMAGE_FOLDER = 'brindes'

export const giftsService = {
  async getAll({ search, categoria, ativo } = {}) {
    let query = supabase.from(TABLE).select('*').order('nome', { ascending: true })

    if (typeof ativo === 'boolean') query = query.eq('ativo', ativo)
    if (categoria) query = query.eq('categoria', categoria)
    if (search) query = query.ilike('nome', `%${search}%`)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getActive() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, nome, estoque_atual, valor_unitario, imagem_url')
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  /**
   * Cadastra um brinde. Nunca recebe `estoque_atual` — o estoque inicial
   * (se informado) é lançado como movimentação de entrada separadamente,
   * via giftMovementsService.create, para que toda alteração de estoque
   * sempre tenha uma movimentação correspondente.
   */
  async create(payload) {
    const { nome, descricao, categoria, fornecedor, valor_unitario, estoque_minimo, observacoes, imagem_url } = payload
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        nome,
        descricao: descricao || null,
        categoria: categoria || null,
        fornecedor: fornecedor || null,
        valor_unitario: valor_unitario || 0,
        estoque_minimo: estoque_minimo || 0,
        observacoes: observacoes || null,
        imagem_url: imagem_url || null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Atualiza dados cadastrais do brinde. Nunca altera `estoque_atual`
   * diretamente — isso só acontece via movimentação. `imagem_url` só muda
   * se o payload trouxer explicitamente um valor diferente (o form sempre
   * carrega o valor atual, então editar outros campos não apaga a imagem).
   */
  async update(id, payload) {
    const { nome, descricao, categoria, fornecedor, valor_unitario, estoque_minimo, ativo, observacoes, imagem_url } = payload
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        nome,
        descricao: descricao || null,
        categoria: categoria || null,
        fornecedor: fornecedor || null,
        valor_unitario: valor_unitario || 0,
        estoque_minimo: estoque_minimo || 0,
        ativo,
        observacoes: observacoes || null,
        imagem_url: imagem_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Faz upload da imagem do brinde para o bucket 'assets', pasta 'brindes/'.
   * Nome de arquivo sempre único (timestamp) — nunca sobrescreve, então não
   * precisamos de policy de UPDATE no storage nem de `upsert`.
   */
  async uploadImage(file, entityId) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Formato inválido. Envie uma imagem PNG, JPG ou WebP.')
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error('A imagem deve ter no máximo 2 MB.')
    }

    const ext = file.name.split('.').pop()
    const path = `${IMAGE_FOLDER}/${entityId}-${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type })
    if (error) throw error

    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
    return data.publicUrl
  },

  /** Remove uma imagem do storage pela URL pública. Falha silenciosamente (não crítico). */
  async removeImage(publicUrl) {
    if (!publicUrl) return
    try {
      const path = publicUrl.split(`/${IMAGE_BUCKET}/`)[1]
      if (path) await supabase.storage.from(IMAGE_BUCKET).remove([path])
    } catch (_) {
      // silencia erro de remoção — mesmo padrão do settingsService.deleteLogo
    }
  },

  async toggleActive(id, ativo) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ativo, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Números agregados para os cards de resumo do Dashboard (StockSummaryCards).
   * Listas recentes (movimentações, entregas de kit) ficam em giftDashboardService,
   * carregadas por blocos independentes — este método não busca nada "sob demanda".
   */
  async getDashboardSummary() {
    const { data: brindes, error: brindesError } = await supabase
      .from(TABLE)
      .select('id, estoque_atual, estoque_minimo, valor_unitario, ativo')
    if (brindesError) throw brindesError

    const { count: entregasRealizadas, error: entregasError } = await supabase
      .from('brinde_entregas')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'entregue')
    if (entregasError) throw entregasError

    const ativos = brindes.filter((b) => b.ativo)
    const valorEmEstoque = brindes.reduce((acc, b) => acc + (b.estoque_atual || 0) * Number(b.valor_unitario || 0), 0)
    const abaixoDoMinimo = ativos.filter((b) => b.estoque_atual <= b.estoque_minimo)

    return {
      totalBrindes: brindes.length,
      valorEmEstoque,
      itensAbaixoDoMinimo: abaixoDoMinimo.length,
      entregasRealizadas: entregasRealizadas || 0,
    }
  },
}

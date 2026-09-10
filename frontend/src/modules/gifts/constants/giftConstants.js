export const TIPOS_MOVIMENTACAO = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'saida', label: 'Saída' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'perda', label: 'Perda' },
  { value: 'devolucao', label: 'Devolução' },
]

export const CONTEXTOS = [
  { value: 'feira', label: 'Feira' },
  { value: 'lead', label: 'Lead' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'visitante', label: 'Visitante' },
  { value: 'evento_interno', label: 'Evento interno' },
  { value: 'acao_comercial', label: 'Ação comercial' },
  { value: 'treinamento', label: 'Treinamento' },
  { value: 'entrega_avulsa', label: 'Entrega avulsa' },
  { value: 'ajuste_estoque', label: 'Ajuste de estoque' },
  { value: 'perda', label: 'Perda' },
  { value: 'outro', label: 'Outro' },
  // Gerado automaticamente por registrar_carga_feira (estoque central →
  // carga local da feira) — não confundir com entrega ao visitante, que
  // não gera brinde_movimentacoes.
  { value: 'carga_feira', label: 'Carga de feira' },
]

export function formatTipoMovimentacao(tipo) {
  return TIPOS_MOVIMENTACAO.find((t) => t.value === tipo)?.label || tipo
}

export function formatContexto(contexto) {
  return CONTEXTOS.find((c) => c.value === contexto)?.label || contexto || '—'
}

export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

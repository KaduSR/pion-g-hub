import { formatDateTime } from './helpers'

const COLUMNS = [
  { header: 'Data/Hora de captura', get: (lead) => formatDateTime(lead.created_at) },
  { header: 'Nome', get: (lead) => lead.nome },
  { header: 'Empresa', get: (lead) => lead.empresa },
  { header: 'Telefone', get: (lead) => lead.telefone },
  { header: 'E-mail', get: (lead) => lead.email },
  { header: 'Cidade', get: (lead) => lead.cidade },
  { header: 'UF', get: (lead) => lead.estado },
  { header: 'Segmento', get: (lead) => lead.segmento },
  { header: 'Produto de interesse', get: (lead) => lead.produto_interesse },
  { header: 'Temperatura', get: (lead) => lead.temperatura },
  { header: 'Vendedor', get: (lead) => lead.vendedor },
  { header: 'Status', get: (lead) => lead.status },
  { header: 'Origem', get: (lead) => lead.origem },
  { header: 'Observações', get: (lead) => lead.observacoes },
  { header: 'Feira', get: (_lead, fairName) => fairName },
]

// Dado de lead é digitado por terceiros (nome/empresa/observações etc.) —
// um valor começando com =, +, -, @ (ou tab/CR) pode ser lido como fórmula
// por planilhas que reabrem/reimportam esse conteúdo de forma menos
// estrita que o XLSX nativo. Prefixar com aspas simples neutraliza a
// interpretação como expressão sem alterar o texto visível pro usuário.
function sanitizeCell(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/^[=+\-@\t\r]/.test(str)) return `'${str}`
  return str
}

/**
 * Gera e dispara o download de um .xlsx com os leads de uma feira.
 * `leads` já deve vir filtrado/paginado por completo (getAllByFairForExport)
 * — este utilitário só formata e empacota, não busca nem pagina dados.
 *
 * SheetJS só é carregado aqui dentro (import dinâmico), não no topo do
 * módulo — ele é pesado e só é usado nesse fluxo de clique em "Exportar
 * dados", então não deve entrar no bundle inicial da aplicação.
 */
export async function exportLeadsToXlsx({ leads, fairName }) {
  const XLSX = await import('xlsx')

  const header = COLUMNS.map((col) => col.header)
  const rows = leads.map((lead) =>
    COLUMNS.map((col) => sanitizeCell(col.get(lead, fairName)))
  )

  const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads')

  const filename = buildFilename(fairName)
  XLSX.writeFile(workbook, filename)
}

// Faixa Unicode "Combining Diacritical Marks" (0x0300-0x036F), construída
// por código numérico para evitar depender de caracteres combinantes
// literais no próprio arquivo-fonte.
const DIACRITICS_REGEX = new RegExp(
  '[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']',
  'g'
)

function buildFilename(fairName) {
  const today = new Date().toISOString().slice(0, 10)
  const slug = (fairName || 'feira')
    .normalize('NFD').replace(DIACRITICS_REGEX, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'feira'
  return `${slug}-leads-${today}.xlsx`
}

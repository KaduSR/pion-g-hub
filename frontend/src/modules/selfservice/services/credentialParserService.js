/**
 * Parser do conteúdo bruto lido do QR Code da credencial da feira.
 *
 * O formato oficial ainda não foi definido pelo fornecedor da credencial —
 * por isso este parser hoje só reconhece um formato simples de teste
 * ("CHAVE=VALOR;CHAVE=VALOR;...") e retorna null para qualquer outra coisa.
 * Quando o formato real for homologado, troque a lógica AQUI — o resto do
 * fluxo (CredentialScanner, LeadCaptureForm) não precisa mudar.
 *
 * Separação deliberada (ver Sprint "Autoatendimento"): CredentialScanner só
 * entrega o texto bruto lido pela câmera; tudo relacionado a interpretar
 * esse texto — e só isso — vive aqui.
 */
export function parseCredentialContent(rawText) {
  if (!rawText || typeof rawText !== 'string') return null

  const fields = {}
  rawText.split(';').forEach((part) => {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex === -1) return
    const key = part.slice(0, separatorIndex).trim().toLowerCase()
    const value = part.slice(separatorIndex + 1).trim()
    if (key && value) fields[key] = value
  })

  // Formato de teste só é considerado "reconhecido" se tiver ao menos nome
  // ou e-mail — caso contrário, o conteúdo não é uma credencial esperada
  // (ex: um QR Code qualquer apontado por engano) e o parser deve recusar.
  if (!fields.nome && !fields.email) return null

  return {
    nome: fields.nome || '',
    empresa: fields.empresa || '',
    email: fields.email || '',
    telefone: fields.telefone || '',
  }
}

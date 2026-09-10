import { leadsService } from '../../fairs/services/leadsService'

function normalizePhone(v) {
  return (v || '').replace(/\D/g, '')
}

function normalizeText(v) {
  return (v || '').trim().toLowerCase()
}

/**
 * Pré-checagem de duplicidade no Autoatendimento interno. Não usa RPC nova
 * — leads_feira já é legível por qualquer authenticated (RLS `USING(true)`
 * desde a Sprint 3.6), então basta trazer os leads da própria feira e
 * comparar no client. O volume por feira é pequeno o suficiente pra isso
 * ser rápido (mesma feira que já alimenta o Select de leads da entrega).
 */
export const leadDuplicateService = {
  async findPossibleDuplicate({ feiraId, nome, empresa, telefone, email }) {
    if (!feiraId) return null

    const leads = await leadsService.getByFair(feiraId)
    const phone = normalizePhone(telefone)
    const mail = normalizeText(email)
    const nomeNorm = normalizeText(nome)
    const empresaNorm = normalizeText(empresa)

    return (
      leads.find((l) => {
        if (phone && normalizePhone(l.telefone) === phone) return true
        if (mail && normalizeText(l.email) === mail) return true
        if (nomeNorm && empresaNorm && normalizeText(l.nome) === nomeNorm && normalizeText(l.empresa) === empresaNorm) return true
        return false
      }) || null
    )
  },
}

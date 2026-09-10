import { supabase } from '../../../lib/supabase'

const TABLE = 'brinde_kit_feiras'

export const fairKitsService = {
  async getByFair(feiraId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('kit_id')
      .eq('feira_id', feiraId)
    if (error) throw error
    return data.map((row) => row.kit_id)
  },

  /**
   * Substitui a configuração completa de kits da feira. Nunca faz DELETE +
   * INSERT client-side (padrão usado em fairsService.saveFairTeam) — aqui a
   * escrita precisa de uma regra de negócio (>=1 kit, kits existentes e
   * ativos, sem estado parcial) que só a RPC transacional
   * set_brinde_kits_feira garante. Bloqueio de kitIds vazio também aqui é
   * só UX antecipada — a RPC rejeita de qualquer forma.
   */
  async setForFair(feiraId, kitIds) {
    const ids = Array.from(new Set(kitIds || []))
    if (ids.length === 0) {
      throw new Error('Selecione ao menos um kit para esta feira.')
    }
    const { error } = await supabase.rpc('set_brinde_kits_feira', {
      p_feira_id: feiraId,
      p_kit_ids: ids,
    })
    if (error) throw new Error(error.message)
  },
}

/**
 * Regra canônica de disponibilidade de kits por feira, para ENTREGA (P2,
 * Fase 3.1). 0 associações = nenhum kit disponível — o fallback de
 * compatibilidade ("todos os kits ativos") foi revogado após QA HML
 * identificar risco de escala (catálogo global inteiro aparecendo em toda
 * feira sem curadoria). Feira precisa ser explicitamente configurada com
 * >=1 kit antes de operar entrega de kit. Única fonte de verdade, usada
 * por FairGiftDeliveryModal e ExistingClientGiftForm para nunca divergir
 * entre si. Não usada pela tela de gestão (FairGiftStockTab), que precisa
 * mostrar o catálogo completo para permitir a própria configuração.
 */
export function filterKitsForFair(kits, associatedKitIds) {
  if (!associatedKitIds || associatedKitIds.length === 0) return []
  const allowed = new Set(associatedKitIds)
  return kits.filter((k) => allowed.has(k.id))
}

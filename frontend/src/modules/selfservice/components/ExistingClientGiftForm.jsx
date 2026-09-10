import React, { useEffect, useMemo, useRef, useState } from 'react'
import { User, Building2, Phone, MessageSquare, ArrowLeft, Gift, Minus, Plus } from 'lucide-react'
import { FormField, Input, Select, Textarea, Button } from '../../../shared/components/FormField'
import { giftsService } from '../../gifts/services/giftsService'
import { giftKitsService } from '../../gifts/services/giftKitsService'
import { fairKitsService, filterKitsForFair } from '../../gifts/services/fairKitsService'
import { fairGiftStockService, computeSaldo } from '../../gifts/services/fairGiftStockService'
import { giftDeliveriesService } from '../../gifts/services/giftDeliveriesService'
import { AttendanceSuccess } from './AttendanceSuccess'

const EMPTY_FORM = {
  nome: '', empresa: '', cargo: '', telefone: '',
  tipoEntrega: 'item_avulso',
  brindeId: '', quantidade: '1',
  kitId: '', kitQuantidade: 1,
  observacoes: '',
}

// Mensagens exibidas quando um kit não pode ser selecionado — mesmos
// critérios usados pelo cálculo de disponibilidade abaixo.
const KIT_INDISPONIVEL_MENSAGENS = {
  sem_componentes: 'Este kit não possui itens cadastrados.',
  componente_inativo: 'Um ou mais itens deste kit estão inativos.',
  sem_estoque_feira: 'Um ou mais itens deste kit não foram enviados para esta feira.',
  saldo_insuficiente: 'Saldo insuficiente na feira para montar este kit.',
}

// Versão curta das mesmas mensagens, para caber no rótulo do <option> —
// uma option disabled nunca pode ser efetivamente selecionada (bloqueado
// pelo próprio navegador), então o motivo precisa aparecer aqui, e não só
// no painel de detalhes abaixo do <select> (que só existe pra kit
// selecionável, já selecionado).
const KIT_MOTIVO_CURTO = {
  sem_componentes: 'sem itens cadastrados',
  componente_inativo: 'item inativo',
  sem_estoque_feira: 'sem carga nesta feira',
  saldo_insuficiente: 'saldo insuficiente',
}

/**
 * Fluxo 2: brinde para cliente já existente (sem lead, consulta ao NOMUS
 * ainda não integrada). NÃO cria lead — chama registrar_entrega_brinde_feira
 * com tipo_destinatario='cliente_existente' (Sprint "Autoatendimento"),
 * mesma RPC atômica do fluxo de lead, só que sem lead_id e com
 * nome/empresa gravados direto na entrega.
 *
 * `cargo` é coletado na UI mas não tem coluna própria em brinde_entregas
 * hoje — vai anexado ao início de `observacoes` pra não se perder,
 * documentado aqui como pendência de schema pra uma sprint futura.
 *
 * Sprint 5.1.1 (Fatia B): passa a aceitar também entrega de kit, além do
 * item avulso já existente — mesma RPC (`registrar_entrega_brinde_feira`,
 * via `deliverAtFair`), sem nenhuma rota nova. A disponibilidade de cada
 * kit é calculada aqui no cliente só para orientar o atendente (desabilitar
 * a opção, mostrar o motivo); a validação real e definitiva de saldo
 * continua acontecendo no servidor, dentro da RPC.
 */
export function ExistingClientGiftForm({ feiraId, onDone }) {
  const [gifts, setGifts] = useState([])
  const [kits, setKits] = useState([])
  const [associatedKitIds, setAssociatedKitIds] = useState([])
  const [saldoRows, setSaldoRows] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [duplicateInfo, setDuplicateInfo] = useState(null)
  const [result, setResult] = useState(null)

  // Guarda a "última" requisição de saldo em voo — se a feira mudar antes
  // de uma resposta anterior chegar, a resposta atrasada (de uma feira que
  // não é mais a selecionada) é descartada em vez de sobrescrever o saldo
  // atual. Cobre tanto troca rápida de feira quanto a recarga disparada
  // após uma entrega, que pode terminar depois de uma nova troca de feira.
  const saldoRequestRef = useRef(0)

  const loadSaldo = () => {
    const requestId = ++saldoRequestRef.current
    if (!feiraId) { setSaldoRows([]); return }
    fairGiftStockService.getByFair(feiraId)
      .then((data) => { if (saldoRequestRef.current === requestId) setSaldoRows(data) })
      .catch(() => { if (saldoRequestRef.current === requestId) setSaldoRows([]) })
  }

  useEffect(() => {
    giftsService.getActive().then(setGifts).catch(() => setGifts([]))
    // Ao contrário de FairGiftDeliveryModal.jsx (que só lista kits já
    // montáveis), aqui TODO kit ativo entra na lista — inclusive sem
    // componentes — pra que kitAvailability (abaixo) consiga sinalizá-lo
    // como indisponível com o motivo explícito, em vez de escondê-lo.
    giftKitsService.getAll({ ativo: true }).then(setKits).catch(() => setKits([]))
    if (feiraId) {
      fairKitsService.getByFair(feiraId).then(setAssociatedKitIds).catch(() => setAssociatedKitIds([]))
    } else {
      setAssociatedKitIds([])
    }
    loadSaldo()
    // Troca de feira invalida qualquer seleção de brinde/kit já feita —
    // saldo e disponibilidade são específicos de cada feira, então uma
    // seleção da feira anterior não pode seguir marcada (nem ser enviada)
    // na feira nova.
    setForm((f) => ({ ...f, brindeId: '', quantidade: '1', kitId: '', kitQuantidade: 1 }))
    setErrors((prev) => {
      const { brindeId, quantidade, kitId, ...rest } = prev
      return rest
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feiraId])

  // Kit trocado: quantidade sempre volta para 1 — mesmo critério do
  // FairGiftDeliveryModal, nunca herda a seleção do kit anterior.
  useEffect(() => { setForm((f) => ({ ...f, kitQuantidade: 1 })) }, [form.kitId])

  const saldoByBrinde = useMemo(() => {
    const map = {}
    saldoRows.forEach((row) => { map[row.brinde_id] = computeSaldo(row) })
    return map
  }, [saldoRows])

  // giftsService.getActive() já retorna só brindes com ativo=true — usado
  // aqui como o conjunto de referência pra saber se um componente de kit
  // está ativo, sem precisar de um novo campo/consulta em giftKitsService.
  const activeBrindeIds = useMemo(() => new Set(gifts.map((g) => g.id)), [gifts])

  // P2: catálogo de kits restrito à feira (fonte canônica em
  // fairKitsService — 0 associações = nenhum kit disponível para entrega).
  // Mesma regra usada em FairGiftDeliveryModal.jsx, para nunca divergir
  // entre os dois pontos de entrega.
  const visibleKits = useMemo(() => filterKitsForFair(kits, associatedKitIds), [kits, associatedKitIds])

  // Disponibilidade de cada kit visível: quantos kits completos dá pra
  // montar com o saldo atual da feira — min(floor(saldo_componente / qtd)).
  const kitAvailability = useMemo(() => {
    const map = {}
    visibleKits.forEach((kit) => {
      const itens = kit.brinde_kit_itens || []
      if (itens.length === 0) {
        map[kit.id] = { disponivel: 0, motivo: 'sem_componentes' }
        return
      }
      if (itens.some((item) => !activeBrindeIds.has(item.brinde_id))) {
        map[kit.id] = { disponivel: 0, motivo: 'componente_inativo' }
        return
      }
      if (itens.some((item) => saldoByBrinde[item.brinde_id] === undefined)) {
        map[kit.id] = { disponivel: 0, motivo: 'sem_estoque_feira' }
        return
      }
      const disponivel = Math.min(...itens.map((item) => Math.floor(saldoByBrinde[item.brinde_id] / item.quantidade)))
      map[kit.id] = { disponivel, motivo: disponivel > 0 ? null : 'saldo_insuficiente' }
    })
    return map
  }, [visibleKits, activeBrindeIds, saldoByBrinde])

  const saldoSelecionado = form.brindeId ? (saldoByBrinde[form.brindeId] ?? 0) : null
  const kitSelecionado = form.kitId ? visibleKits.find((k) => k.id === form.kitId) : null
  const disponibilidadeKitSelecionado = form.kitId ? kitAvailability[form.kitId] : null

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  // Trocar o tipo de entrega descarta a seleção do tipo anterior — um item
  // avulso escolhido não vira sugestão de kit, e vice-versa.
  const handleTipoChange = (e) => {
    const tipoEntrega = e.target.value
    setForm((f) => ({ ...f, tipoEntrega, brindeId: '', quantidade: '1', kitId: '', kitQuantidade: 1 }))
    setErrors((prev) => {
      const { brindeId, quantidade, kitId, ...rest } = prev
      return rest
    })
  }

  const validate = () => {
    const e = {}
    if (!feiraId) e.submit = 'Nenhuma feira selecionada.'
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (!form.empresa.trim()) e.empresa = 'Empresa é obrigatória'

    if (form.tipoEntrega === 'item_avulso') {
      if (!form.brindeId) e.brindeId = 'Selecione o brinde'
      const qtd = Number(form.quantidade)
      if (!qtd || qtd <= 0) e.quantidade = 'Quantidade inválida'
      else if (saldoSelecionado !== null && qtd > saldoSelecionado) e.quantidade = `Saldo disponível na feira: ${saldoSelecionado}`
    } else {
      if (!form.kitId) {
        e.kitId = 'Selecione o kit'
      } else {
        const disponibilidade = kitAvailability[form.kitId]
        if (!disponibilidade || disponibilidade.disponivel <= 0) {
          e.kitId = KIT_INDISPONIVEL_MENSAGENS[disponibilidade?.motivo] || 'Este kit não está disponível para entrega nesta feira.'
        } else if (!form.kitQuantidade || form.kitQuantidade < 1) {
          e.kitQuantidade = 'Quantidade inválida'
        } else if (form.kitQuantidade > disponibilidade.disponivel) {
          e.kitQuantidade = `Disponível na feira: ${disponibilidade.disponivel}`
        }
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submitDelivery = async (confirmarDuplicidade) => {
    setSaving(true)
    setErrors({})
    try {
      const observacoes = [form.cargo ? `Cargo: ${form.cargo.trim()}` : null, form.observacoes.trim() || null]
        .filter(Boolean).join(' — ') || null

      const data = await giftDeliveriesService.deliverAtFair({
        feiraId,
        tipoEntrega: form.tipoEntrega,
        kitId: form.tipoEntrega === 'kit' ? form.kitId : null,
        quantidadeKits: form.tipoEntrega === 'kit' ? form.kitQuantidade : 1,
        itens: form.tipoEntrega === 'item_avulso'
          ? [{ brindeId: form.brindeId, quantidade: Number(form.quantidade) }]
          : null,
        observacoes,
        origem: 'interno',
        tipoDestinatario: 'cliente_existente',
        destinatarioNome: form.nome.trim(),
        destinatarioEmpresa: form.empresa.trim(),
        destinatarioContato: form.telefone || null,
        confirmarDuplicidade: !!confirmarDuplicidade,
      })

      if (data?.possivel_duplicata) {
        setDuplicateInfo(data)
        return
      }

      setDuplicateInfo(null)
      setResult(data)
      // Reflete a baixa que a RPC acabou de aplicar — sem isso, o próximo
      // atendimento na mesma sessão mostraria saldo/disponibilidade de kit
      // defasados até um refresh manual.
      loadSaldo()
    } catch (err) {
      setErrors({ submit: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving || !validate()) return
    await submitDelivery(false)
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setDuplicateInfo(null)
    setResult(null)
  }

  if (result) {
    const tipoEntregue = result.entrega?.tipo_entrega
    const itensEntregues = result.itens || []

    const details = tipoEntregue === 'kit'
      ? [
        { label: 'Cliente', value: form.nome },
        { label: 'Empresa', value: form.empresa },
        { label: 'Kit', value: kits.find((k) => k.id === form.kitId)?.nome || '—' },
        { label: 'Quantidade de kits', value: String(result.entrega?.quantidade ?? form.kitQuantidade) },
        { label: 'Itens do kit', value: itensEntregues.map((it) => `${it.quantidade}x ${it.nome}`).join(', ') || '—' },
      ]
      : [
        { label: 'Cliente', value: form.nome },
        { label: 'Empresa', value: form.empresa },
        { label: 'Brinde', value: itensEntregues[0]?.nome || gifts.find((g) => g.id === form.brindeId)?.nome || '—' },
        { label: 'Quantidade', value: form.quantidade },
      ]

    return (
      <AttendanceSuccess
        title="Brinde registrado com sucesso."
        details={details}
        secondaryAction={{ label: 'Novo atendimento', onClick: () => { resetForm(); onDone() } }}
        primaryAction={{ label: 'Registrar outro brinde', onClick: resetForm }}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {duplicateInfo && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#92400e', fontSize: 14 }}>Atenção</p>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#78350f' }}>
            {duplicateInfo.destinatario_nome}, da empresa {duplicateInfo.destinatario_empresa}, já recebeu um brinde nesta feira.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button type="button" variant="secondary" size="md" onClick={() => setDuplicateInfo(null)}>
              <ArrowLeft size={14} /> Cancelar
            </Button>
            <Button type="button" size="md" loading={saving} onClick={() => submitDelivery(true)}>
              Confirmar outra entrega
            </Button>
          </div>
        </div>
      )}

      {!duplicateInfo && (
        <>
          <FormField label="Nome" required error={errors.nome}>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <Input large autoFocus value={form.nome} onChange={set('nome')} placeholder="Nome completo" error={errors.nome} style={{ paddingLeft: 44 }} />
            </div>
          </FormField>

          <FormField label="Empresa" required error={errors.empresa}>
            <div style={{ position: 'relative' }}>
              <Building2 size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <Input large value={form.empresa} onChange={set('empresa')} placeholder="Nome da empresa" error={errors.empresa} style={{ paddingLeft: 44 }} />
            </div>
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <FormField label="Cargo (opcional)">
              <Input large value={form.cargo} onChange={set('cargo')} placeholder="Cargo" />
            </FormField>
            <FormField label="Telefone (opcional)">
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <Input large type="tel" value={form.telefone} onChange={set('telefone')} placeholder="(00) 00000-0000" style={{ paddingLeft: 44 }} />
              </div>
            </FormField>
          </div>

          <FormField label="Tipo de entrega" required>
            <Select large value={form.tipoEntrega} onChange={handleTipoChange}>
              <option value="item_avulso">Item avulso</option>
              <option value="kit">Kit</option>
            </Select>
          </FormField>

          {form.tipoEntrega === 'item_avulso' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0 16px' }}>
                <FormField label="Brinde" required error={errors.brindeId}>
                  <Select large value={form.brindeId} onChange={set('brindeId')} error={errors.brindeId}>
                    <option value="">Selecione o brinde</option>
                    {gifts.map((g) => (
                      <option key={g.id} value={g.id}>{g.nome} (saldo na feira: {saldoByBrinde[g.id] ?? 0})</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Quantidade" required error={errors.quantidade}>
                  <Input
                    large type="number" min="1" step="1"
                    max={saldoSelecionado !== null ? saldoSelecionado : undefined}
                    value={form.quantidade} onChange={set('quantidade')} error={errors.quantidade}
                  />
                </FormField>
              </div>
              {saldoSelecionado !== null && (
                <p style={{ marginTop: -10, marginBottom: 16, fontSize: 13, color: '#64748b' }}>
                  Estoque disponível na feira: <strong>{saldoSelecionado}</strong>
                </p>
              )}
            </>
          ) : (
            <>
              <FormField label="Kit" required error={errors.kitId}>
                {feiraId && visibleKits.length === 0 ? (
                  <div style={{
                    background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e',
                    padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 500,
                  }}>
                    Nenhum kit configurado para esta feira.
                  </div>
                ) : (
                  <Select large value={form.kitId} onChange={set('kitId')} error={errors.kitId}>
                    <option value="">Selecione o kit</option>
                    {visibleKits.map((k) => {
                      const disponibilidade = kitAvailability[k.id]
                      const indisponivel = !disponibilidade || disponibilidade.disponivel <= 0
                      return (
                        <option key={k.id} value={k.id} disabled={indisponivel}>
                          {k.nome}{indisponivel
                            ? ` — indisponível (${KIT_MOTIVO_CURTO[disponibilidade?.motivo] || 'indisponível'})`
                            : ` (${disponibilidade.disponivel} disponíveis)`}
                        </option>
                      )
                    })}
                  </Select>
                )}
              </FormField>

              {kitSelecionado && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginTop: -10, marginBottom: 16 }}>
                  <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: disponibilidadeKitSelecionado?.disponivel > 0 ? '#059669' : '#dc2626' }}>
                    {disponibilidadeKitSelecionado?.disponivel > 0
                      ? `Kits completos disponíveis: ${disponibilidadeKitSelecionado.disponivel}`
                      : KIT_INDISPONIVEL_MENSAGENS[disponibilidadeKitSelecionado?.motivo] || 'Kit indisponível nesta feira.'}
                  </p>

                  {disponibilidadeKitSelecionado?.disponivel > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Quantidade</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, kitQuantidade: Math.max(1, f.kitQuantidade - 1) }))}
                          disabled={form.kitQuantidade <= 1}
                          style={{
                            width: 32, height: 32, borderRadius: '8px 0 0 8px', border: '1px solid #cbd5e1',
                            background: form.kitQuantidade <= 1 ? '#f1f5f9' : '#fff', cursor: form.kitQuantidade <= 1 ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Minus size={14} />
                        </button>
                        <div style={{
                          width: 44, height: 32, border: '1px solid #cbd5e1', borderLeft: 'none', borderRight: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#0f172a',
                        }}>
                          {form.kitQuantidade}
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, kitQuantidade: Math.min(disponibilidadeKitSelecionado.disponivel, f.kitQuantidade + 1) }))}
                          disabled={form.kitQuantidade >= disponibilidadeKitSelecionado.disponivel}
                          style={{
                            width: 32, height: 32, borderRadius: '0 8px 8px 0', border: '1px solid #cbd5e1',
                            background: form.kitQuantidade >= disponibilidadeKitSelecionado.disponivel ? '#f1f5f9' : '#fff',
                            cursor: form.kitQuantidade >= disponibilidadeKitSelecionado.disponivel ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      {errors.kitQuantidade && (
                        <span style={{ fontSize: 12, color: '#dc2626' }}>{errors.kitQuantidade}</span>
                      )}
                    </div>
                  )}

                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#475569' }}>
                    {(kitSelecionado.brinde_kit_itens || []).map((item) => {
                      const saldo = saldoByBrinde[item.brinde_id] ?? 0
                      const necessario = item.quantidade * form.kitQuantidade
                      return (
                        <li key={item.id} style={{ color: saldo < necessario ? '#dc2626' : '#475569' }}>
                          {necessario}x {item.brindes?.nome} — saldo na feira: {saldo}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </>
          )}

          <FormField label="Observação (opcional)">
            <div style={{ position: 'relative' }}>
              <MessageSquare size={18} style={{ position: 'absolute', left: 14, top: 14, color: '#94a3b8' }} />
              <Textarea large value={form.observacoes} onChange={set('observacoes')} rows={2} placeholder="Anotação rápida" style={{ paddingLeft: 44 }} />
            </div>
          </FormField>

          {errors.submit && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14, color: '#dc2626', fontSize: 14, marginBottom: 16 }}>
              {errors.submit}
            </div>
          )}

          <Button type="submit" fullWidth size="xl" loading={saving} disabled={saving}>
            <Gift size={18} /> Registrar brinde
          </Button>
        </>
      )}
    </form>
  )
}

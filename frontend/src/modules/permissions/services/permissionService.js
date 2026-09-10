import { supabase } from '../../../lib/supabase'

/**
 * Carrega as permissões efetivas de um usuário a partir das tabelas do
 * Centro de Permissões (roles/permissions/role_permissions/
 * user_permissions), com cache — SEM fallback para o mapa estático em
 * produção (removido na Etapa 6.2, ver `loadPermissions` abaixo).
 *
 * `constants/permissions.js` (`ROLE_PERMISSIONS`/`getPermissionsForRole`)
 * continua existindo no repositório só para documentação/testes/uso em
 * desenvolvimento — não é mais importado aqui de propósito, pra não sobrar
 * nenhum caminho de código que use o mapa estático pra autorizar alguém em
 * produção.
 */

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos — só controla quando refazer a busca, não quando esquecer o último valor bom (ver loadPermissions)

// chave: `${profileId}:${role}` -> { permissions: Set<string>, loadedAt: number }
//
// Por que a chave inclui o role: se ela fosse só `profileId`, uma troca de
// papel (ex: admin promove um vendedor a gestor) continuaria servindo as
// permissões antigas do cache até o TTL vencer, mesmo que o profileId seja
// o mesmo. Com `profileId:role` na chave, a troca de papel automaticamente
// vira uma chave nova (cache miss), forçando busca fresca.
const cache = new Map()
// mesma chave -> Promise em andamento, pra não disparar 2 buscas em
// paralelo se vários componentes pedirem ao mesmo tempo.
const inFlight = new Map()
// mesma chave -> número da "geração" atual. Incrementado a cada nova busca
// iniciada E a cada invalidação — ver comentário em loadPermissions/
// invalidatePermissionsCache sobre por que isso existe.
const generation = new Map()

function cacheKey(profileId, role) {
  return `${profileId}:${role}`
}

function bumpGeneration(key) {
  const next = (generation.get(key) || 0) + 1
  generation.set(key, next)
  return next
}

/**
 * Permissões do papel do usuário, via role_permissions → permissions.
 * `roles.code` é o elo com `user_profiles.role` (texto), não há FK direta.
 */
async function fetchRolePermissionCodes(roleCode) {
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('code', roleCode)
    .maybeSingle()
  if (roleError) throw roleError
  if (!role) return [] // papel sem linha correspondente em `roles` — fail-closed, igual ao mapa estático

  const { data, error } = await supabase
    .from('role_permissions')
    .select('permissions(code)')
    .eq('role_id', role.id)
  if (error) throw error

  return (data || []).map((row) => row.permissions?.code).filter(Boolean)
}

/**
 * Sobrescritas individuais do usuário. RLS de user_permissions permite ao
 * próprio usuário ler suas próprias linhas (e a admin ler qualquer uma),
 * então isso funciona autenticado como qualquer papel, sem elevação.
 */
async function fetchUserOverrides(profileId) {
  const { data, error } = await supabase
    .from('user_permissions')
    .select('effect, permissions(code)')
    .eq('profile_id', profileId)
  if (error) throw error

  const grants = []
  const revokes = []
  ;(data || []).forEach((row) => {
    const code = row.permissions?.code
    if (!code) return
    if (row.effect === 'grant') grants.push(code)
    else if (row.effect === 'revoke') revokes.push(code)
  })
  return { grants, revokes }
}

/**
 * Fluxo de resolução: permissões do papel, MAIS grants individuais, MENOS
 * revokes individuais — exatamente essa ordem (um revoke sempre vence um
 * grant do papel; nunca o contrário, dado que aplicamos revoke por último).
 */
async function resolveFromDatabase(profileId, roleCode) {
  const [roleCodes, overrides] = await Promise.all([
    fetchRolePermissionCodes(roleCode),
    fetchUserOverrides(profileId),
  ])

  const resolved = new Set(roleCodes)
  overrides.grants.forEach((code) => resolved.add(code))
  overrides.revokes.forEach((code) => resolved.delete(code))
  return resolved
}

/**
 * Carrega as permissões efetivas de `profileId` (papel `roleCode`).
 * Nunca rejeita — sempre resolve pra um resultado utilizável. `source`
 * reflete ESTRITAMENTE de onde o dado veio nesta chamada, nunca uma
 * mistura:
 *
 *   1. `source: 'database'` — só quando esta chamada fez uma consulta ao
 *      banco AGORA e ela teve sucesso. `error: null`, `degraded: false`,
 *      `stale: false`.
 *   2. `source: 'cache'` — qualquer resultado que veio do cache em vez de
 *      uma consulta nova, em dois cenários possíveis:
 *        a) cache dentro do TTL (não tentou o banco de novo, de propósito
 *           — é o caminho rápido normal): `error: null`, `degraded: false`,
 *           `stale: false`.
 *        b) o banco foi consultado AGORA, falhou, e existe um valor
 *           anteriormente bem-sucedido pra esta mesma chave (mesmo que já
 *           tenha passado do TTL): `error` = o erro original da consulta
 *           que falhou, `degraded: true`, `stale: true` — quem consumir
 *           sabe que estes dados podem estar desatualizados.
 *   3. `source: 'denied'` — FAIL CLOSED. O banco falhou e não existe
 *      NENHUM valor em cache pra esta chave. Retorna `permissions` VAZIO
 *      — nunca reconstrói pelo mapa estático (`permissions.js`), que não
 *      sabe nada sobre `user_permissions` (grants/revokes individuais, em
 *      uso real desde a Etapa 6.2 — usá-lo aqui faria um revoke individual
 *      "reaparecer" e um grant individual desaparecer, silenciosamente).
 *      `error` = erro original, `degraded: true`, `stale: false` (não é
 *      dado desatualizado, é ausência de dado — a UI deve tratar isso como
 *      "não foi possível validar", nunca como "sem permissão mesmo", ver
 *      `RequirePermission.jsx`).
 *
 * Proteção contra corrida (ver `generation`): se `invalidatePermissionsCache`
 * for chamada enquanto esta função está com uma busca em andamento pra
 * mesma chave, a busca em andamento NÃO grava mais nada no cache quando
 * terminar — ela verifica se a "geração" que capturou no início ainda é a
 * atual antes de escrever. Isso impede uma busca antiga "reviver" o cache
 * depois de uma invalidação. Da mesma forma, a limpeza do `inFlight` no
 * `finally` só remove a entrada se ela ainda for a MESMA Promise (por
 * identidade, não só a mesma chave) — uma promise antiga nunca apaga a
 * entrada de uma promise mais nova pra mesma chave.
 *
 * @returns {Promise<{permissions: Set<string>, source: 'database'|'cache'|'denied'|'none', error: Error|null, degraded: boolean, stale: boolean}>}
 */
export async function loadPermissions({ profileId, role, forceRefresh = false } = {}) {
  if (!profileId || !role) {
    return { permissions: new Set(), source: 'none', error: null, degraded: false, stale: false }
  }

  const key = cacheKey(profileId, role)

  if (!forceRefresh) {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
      return { permissions: cached.permissions, source: 'cache', error: null, degraded: false, stale: false }
    }

    const pending = inFlight.get(key)
    if (pending) return pending
  }

  const myGeneration = bumpGeneration(key)

  const promise = (async () => {
    try {
      const permissions = await resolveFromDatabase(profileId, role)
      // Só grava se ninguém invalidou (ou iniciou uma busca mais nova) pra
      // esta chave enquanto esta consulta estava em andamento.
      if (generation.get(key) === myGeneration) {
        cache.set(key, { permissions, loadedAt: Date.now() })
      }
      return { permissions, source: 'database', error: null, degraded: false, stale: false }
    } catch (err) {
      const stale = cache.get(key)
      if (stale) {
        return { permissions: stale.permissions, source: 'cache', error: err, degraded: true, stale: true }
      }
      // Fail closed: sem banco e sem cache, ninguém recebe nenhuma
      // permissão. Nunca reconstrói pelo mapa estático em produção.
      return { permissions: new Set(), source: 'denied', error: err, degraded: true, stale: false }
    } finally {
      // Só remove se a entrada em inFlight ainda for ESTA promise — uma
      // promise antiga nunca deve apagar a entrada de uma mais nova pra
      // mesma chave (pode acontecer com forceRefresh sobrepondo uma busca
      // normal já em andamento).
      if (inFlight.get(key) === promise) {
        inFlight.delete(key)
      }
    }
  })()

  inFlight.set(key, promise)
  return promise
}

/**
 * Força a próxima leitura a ignorar o cache e impede que qualquer busca já
 * em andamento pra essa chave grave um resultado depois da invalidação
 * (via bump de geração — ver comentário em `loadPermissions`).
 *
 * Com `profileId` + `role`, invalida só aquela chave; só `profileId`,
 * invalida todas as chaves dele (qualquer papel); sem nada, limpa tudo.
 * Nenhum código chama isto ainda — fica pronto pra Etapa 6 invalidar o
 * cache de alguém depois de alterar o papel dela ou uma sobrescrita
 * individual.
 */
export function invalidatePermissionsCache(profileId, role) {
  if (profileId && role) {
    const key = cacheKey(profileId, role)
    cache.delete(key)
    inFlight.delete(key)
    bumpGeneration(key)
    return
  }

  if (profileId) {
    const prefix = `${profileId}:`
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key)
    }
    for (const key of inFlight.keys()) {
      if (key.startsWith(prefix)) inFlight.delete(key)
    }
    for (const key of generation.keys()) {
      if (key.startsWith(prefix)) bumpGeneration(key)
    }
    return
  }

  cache.clear()
  inFlight.clear()
  generation.clear() // seguro: cache/inFlight também foram zerados por completo acima
}

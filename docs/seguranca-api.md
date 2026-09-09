# Segurança e Rate Limiting — Pion-G-Hub

## Visão Geral
Este documento descreve as políticas de proteção da API do Pion-G-Hub contra abuso de requisições, incluindo rate limiting, headers de resposta e comportamento sob carga.

---

## 1. Política de Rate Limiting

A API implementa **janela deslizante por IP** com limites diferenciados por tipo de rota.

### 1.1 Limites por Perfil de Rota

| Rota | Janela | Limite | Finalidade |
|-------|--------|--------|-----------|
| `/api/v1/auth/*` | 15 min | 10 req | Brute force (login/logout) |
| `/api/v1/*` (leitura) | 15 min | 200 req | Proteção geral |
| `/api/v1/*` (escrita) | 15 min | 60 req | Ações destrutivas |

### 1.2 Comportamento ao Exceder Limite

- **HTTP 429 Too Many Requests**
- JSON: `{ success: false, error: 'Limite de requisicoes excedido...' }`
- Headers informativos: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Reset automático após janela de 15 minutos

### 1.3 Código do Middleware

`src/api/middlewares/rateLimit.middleware.ts`

```ts
import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
  message: { success: false, error: 'Muitas tentativas...' }
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
  message: { success: false, error: 'Limite excedido...' }
});

export const writeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
  message: { success: false, error: 'Muitas operacoes de escrita...' }
});
```

---

## 2. Estratégia de Proteção em Camadas

### 2.1 Camada 1: Infraestrutura
- **Helmet**: headers HTTP de segurança (`X-Content-Type-Options`, `X-Frame-Options`, etc.)
- **CORS**: origem configurável via `CORS_ORIGIN`; bloqueio por padrão exceto desenvolvimento

### 2.2 Camada 2: Aplicação
- **Auth Middleware**: JWT obrigatório em rotas protegidas
- **Nível Hierárquico**: `requireNivelMinimo()` bloqueia acesso por perfil
- **Validação Zod**: rejeição de payloads malformados antes do controller
- **Error Handler**: mensagens genéricas sem stack trace em produção

### 2.3 Camada 3: Rate Limiting
- **Auth**: 10 req/15min — evita brute force
- **API geral**: 200 req/15min — bloqueia scraping/bots
- **Escrita**: 60 req/15min — limita abuso em exclusões/atualizações

### 2.4 Camada 4: Banco
- **Transações**: uso de prepared statements via `pg`
- **RLS**: futuramente no Supabase (migrations 001+ já preparam estrutura)
- **Índices**: migration 009 otimiza queries críticas para evitar lentidão por table scan

---

## 3. Configuração de Ambiente

### Variáveis Recomendadas

```env
# Hostinger / Produção
CORS_ORIGIN=https://app.seudominio.com.br
JWT_SECRET=<chave-aleatoria-32+caracteres>
PORT=3000
NODE_ENV=production
```

### Notas de Segurança
- Alterar `JWT_SECRET` em produção; a atual é fallback de desenvolvimento
- `CORS_ORIGIN` deve ser restrito ao domínio do frontend
- `helmet()` já vem configurado; customizar `helmet.contentSecurityPolicy` se necessário

---

## 4. Testes e Validação

```sh
npm run build   # tsc limpo
npm test        # suite de testes (mock respeita rate limit)
```

### Considerações para Testes
- Os middlewares são aplicados globalmente em `app.ts`
- Supertest usa instância própria do app; o rate limit é reavaliado por requisição
- Em testes de integração, considerar `jest.clearAllMocks()` para resetar contadores

---

## 5. Referências

- `src/api/middlewares/rateLimit.middleware.ts` — implementação
- `src/app.ts` — aplicação global
- `src/api/middleware/auth.middleware.ts` — camada de autenticação
- Migration `009_indices_performance.sql` — otimização de queries

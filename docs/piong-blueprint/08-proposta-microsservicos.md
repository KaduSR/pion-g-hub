# Proposta de Microsservicos - PionG Blueprint

## Divisao de Servicos

| Servico | Responsabilidade | Tecnologia |
|---------|-----------------|------------|
| api-gateway | Routing, Auth central | Express |
| auth-service | Autenticacao, Sessoes | Express |
| admin-service | Modulo administrativo | Express |
| logistica-service | Modulo logistica | Express |
| notificacao-service | Email, Push, In-app | Node |

## Comunicacao

- Sincrona: REST entre servicos
- Assincrona: filas para notificacoes
- Event-driven para atualizacoes em tempo real

## Fase Atual

Monolito inicial com Express + Supabase ate validacao do dominio.
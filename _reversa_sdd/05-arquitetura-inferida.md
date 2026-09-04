# Arquitetura Inferida do PionG Plus

## Visão Geral

Com base na inspeção via browser (SPA navegável, estrutura de URLs, comportamento das APIs e elementos do DOM), infere-se a seguinte stack tecnológica:

## Frontend

```
Framework: React (SPA) + possivelmente Next.js (roteamento client-side observado)
Build Tool: Vite ou Create React App
UI Library: Componentes custom (sem Material UI ou Ant Design óbvios) 
State Management: Zustand ou Context API (atualização instantânea de widgets no dashboard)
Charts: Recharts ou Chart.js (gráficos de evolução mensal, UF, SLA)
Auth: JWT token (login redirecionado para SPA com sessão persistida)
Routing: React Router (navegação por módulo sem reload de página)
```

## Backend Inferido

```
Linguagem: Node.js (Express/Fastify) OU Python (FastAPI/Django)
ORM: Prisma, TypeORM ou SQLAlchemy (baseado na estrutura de dados padronizada)
Autenticação: JWT com refresh token (sessão persistida entre visitas)
Upload: Multipart form-data (upload de planilha .xlsx no Controle de Ponto)
Export: Biblioteca de geração de Excel (xlsx) e CSV
```

## Banco de Dados

```
Principal: PostgreSQL (inferido por volume de dados, RLS, e integração com Supabase)
Cache/Sessão: Redis (sessões de usuários, dados de "Usuários Online")
File Storage: S3-compatible ou armazenamento local (uploads de planilhas)
```

## Domínios de Dados (Schema por prefixo)

| Domínio | Prefixo | Entidades Principais |
|---|---|---|
| RH | rh_ | colaboradores, setores, cargos, escalas, pontos, absenteismo |
| Produção | prd_ | ordens, apontamentos, indicadores, produtividade |
| Manutenção | mt_ | ordens_servico, equipamentos, tecnicos, prioridades |
| Logística | log_ | fretes, lancamentos, transportadoras, clientes_destino |
| Administrativo | adm_ | filiais, feriados, permissoes, perfis_acesso |
| Comunicação | com_ | avisos, leituras_aviso, notificacoes |
| Auth | auth_ | usuarios, perfis, sessoes, tokens |

## Integrações Identificadas

| Integração | Evidência | Tipo |
|---|---|---|
| Sistema de Ponto Eletrônico | Upload de planilha .xlsx no Controle de Ponto | Inbound (importação manual) |
| Email/Notificações | Quadro de Avisos com controle de leitura | Outbound (notificações) |
| Exportação de Relatórios | Botões "Exportar CSV" e "Exportar Excel" | Outbound |
| IXC Provedor (possível) | Integração inferida por perfil do sistema | Outbound (API) |
| n8n / Automação | Possível automação de notificações e OS | Middleware |

## Entidades de Dados Mapeadas

### Colaborador
```json
{
  "id": "uuid",
  "nome": "string",
  "matricula": "string",
  "filial": "string",
  "departamento": "string",
  "setor": "string",
  "cargo": "string",
  "tipo_acesso": "enum(Colaborador, Administrador, ...)",
  "status": "enum(Ativo, Férias, Suspenso, Afastado, Desligado)",
  "data_admissao": "date",
  "data_nascimento": "date"
}
```

### Ordem de Serviço (OS)
```json
{
  "id": "uuid",
  "numero": "string",
  "titulo": "string",
  "tipo": "enum(Elétrica, Mecânica, Melhoria, Operacional, Projeto)",
  "classe": "enum(Operação, Manutenção, Projeto/Equipamento)",
  "prioridade": "enum(Baixa, Média, Alta, Crítica)",
  "status": "enum(Aberto, Agendado, Em Andamento, Aguardando Peça, Concluído, Cancelado)",
  "equipamento": "string",
  "local": "string",
  "solicitante": "uuid -> colaborador",
  "tecnico_responsavel": "uuid -> colaborador",
  "data_abertura": "datetime",
  "data_conclusao": "datetime|null"
}
```

### Frete / Lançamento Logístico
```json
{
  "id": "uuid",
  "data": "date",
  "nf": "string",
  "cliente": "string",
  "transportadora": "uuid -> transportadora",
  "valor_frete": "decimal",
  "percentual_sla": "decimal|null",
  "status": "enum(Em Transporte, Entregue no Prazo, Entregue com Atraso, Atrasado, Cancelado)",
  "uf_destino": "string(2)"
}
```

### Aviso
```json
{
  "id": "uuid",
  "titulo": "string",
  "conteudo": "text",
  "criado_por": "uuid -> colaborador",
  "data_criacao": "datetime",
  "status": "enum(Ativo, Inativo)",
  "total_destinatarios": "integer",
  "total_leituras": "integer"
}
```

### Permissão / Perfil de Acesso
```json
{
  "id": "uuid",
  "nome": "string",
  "modulos": [
    {
      "modulo": "string",
      "leitura": "boolean",
      "editar": "boolean",
      "deletar": "boolean",
      "ocultar": "boolean"
    }
  ]
}
```

## Padrões de Design Identificados

1. **SPA com Estado Global** — navegação entre módulos sem reload, estado de usuário persistido na barra superior
2. **RBAC granular** — matriz de permissões CRUD por módulo com 10+ perfis predefinidos
3. **Dashboard orientado a indicadores** — widgets movíveis, dados em tempo real
4. **Upload-import workflow** — planilhas importadas manualmente (ponto eletrônico, logística via CSV)
5. **Status Machine** — OS manutenção e fretes têm progressão de estados bem definida
6. **Multi-filial** — estrutura suporta filiais com isolamento de dados por filial

## Modos de Comunicação Interna

- **Quadro de Avisos** — push de comunicados com rastreio de leitura por colaborador
- **Notificações** — badge "9+" no header indica sistema de notificações ativo
- **Sugestões** — módulo de colaboradores para envio de sugestões (inferido via Permissões)

## Observações de Segurança

- Sessão JWT persistida (reautenticação automática entre visitas observada)
- Controle de acesso por perfil com ocultação de módulos (não apenas bloqueio)
- Dados de usuários online visíveis para administradores (monitoramento ativo)
- Ações destrutivas presentes (Excluir colaborador, Limpar marcações de ponto, Limpar todos os fretes)
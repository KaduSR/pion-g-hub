# FairTrack — Módulo de Feiras e Captação de Leads

Sistema interno de gestão de feiras e captação de leads para uso em estandes com tablet.

## Stack

- **React + Vite** — Frontend
- **Supabase** — Banco de dados (PostgreSQL)
- **React Router v6** — Roteamento
- **Recharts** — Gráficos
- **Lucide React** — Ícones

---

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Supabase

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

### 3. Criar tabelas no Supabase

Execute o arquivo `supabase/schema.sql` no **SQL Editor** do seu projeto Supabase.

O script irá criar:
- Tabela `feiras`
- Tabela `leads_feira`
- Índices de performance
- Row Level Security (RLS)
- Dados de exemplo

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

### 5. Build para produção

```bash
npm run build
```

---

## Estrutura do Projeto

```
src/
├── lib/
│   └── supabase.js              # Cliente Supabase
├── modules/
│   └── fairs/
│       ├── pages/
│       │   ├── DashboardPage.jsx    # Dashboard com gráficos
│       │   ├── FairsPage.jsx        # CRUD de feiras
│       │   ├── LeadCapturePage.jsx  # Captura otimizada para tablet
│       │   └── LeadsPage.jsx        # Gestão/listagem de leads
│       ├── components/
│       │   └── FairForm.jsx         # Formulário de feira
│       ├── services/
│       │   ├── fairsService.js      # API feiras
│       │   └── leadsService.js      # API leads
│       ├── hooks/
│       │   ├── useFairs.js          # Hook CRUD feiras
│       │   └── useLeads.js          # Hook CRUD leads (com paginação)
│       └── contexts/
│           └── FairsContext.jsx     # Context global de feiras ativas
├── shared/
│   ├── components/
│   │   ├── Badge.jsx
│   │   ├── FormField.jsx            # Input, Select, Textarea, Button
│   │   ├── Modal.jsx
│   │   ├── Sidebar.jsx
│   │   └── Toast.jsx
│   └── utils/
│       ├── constants.js             # Segmentos, produtos, status etc.
│       └── helpers.js               # Formatação de datas, phone, etc.
├── routes/
│   └── AppRoutes.jsx
├── App.jsx
├── main.jsx
└── index.css
```

---

## Funcionalidades

### Dashboard (`/`)
- Cards: Total, Quentes, Mornos, Frios
- Gráfico de barras: leads por vendedor
- Gráfico de pizza: temperatura dos leads
- Gráfico horizontal: leads por segmento
- Gráfico de barras: leads por feira
- Filtro por feira

### Feiras (`/feiras`)
- Listagem em cards com status, datas e responsável
- Criar, editar e excluir feiras
- Status: Planejada, Em andamento, Finalizada
- Link direto para leads da feira

### Captar Lead (`/captacao`)
- Tela otimizada para tablet/evento
- Botões grandes, campos grandes
- Seleção visual de temperatura (Frio/Morno/Quente)
- Mantém feira e vendedor entre captações
- Feedback visual de sucesso com contador
- Reset automático para próximo cadastro

### Gestão de Leads (`/leads`)
- Tabela paginada (20 por página)
- Filtros: feira, segmento, temperatura, vendedor
- Pesquisa por nome, empresa, e-mail
- Edição de status inline
- Exclusão com confirmação

---

## Preparação para RD Station

A tabela `leads_feira` possui o campo `status` com o valor `Enviado ao RD`, preparado para integração futura. Para integrar:

1. Adicionar variável de ambiente `VITE_RD_STATION_TOKEN`
2. Criar `src/modules/fairs/services/rdStationService.js`
3. Chamar ao alterar status para "Enviado ao RD" em `LeadsPage`

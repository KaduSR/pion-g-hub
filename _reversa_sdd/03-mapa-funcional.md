# Mapa Funcional Completo do PionG Plus

| Departamento | Módulo | Funcionalidade | Tela | Ações |
|---|---|---|---|---|
| Dashboard | Visão Geral | Dashboard Principal | /dashboard | Visualizar indicadores, filtrar dados, visualizar status colaboradores, manutenção, aniversariantes |
| RH | Colaboradores | Gerenciamento de Funcionários | /colaboradores | Listar, buscar, filtrar por status/setor/departamento, cadastrar novo, visualizar administradores |
| RH | Escala do Mês | Gerenciamento de Escalas | /escala | Visualizar escalas, duplicar escala anterior, criar nova escala |
| RH | Controle de Ponto | Registro e Controle de Ponto | /controle-ponto | Upload de planilha, exportar para Excel, excluir marcações do mês, visualizar saldo de horas por colaborador |
| RH | Produtividade Setor | Análise de Produtividade | /produtividade-setor | (Dados em análise - tela em carregamento) |
| RH | Absenteísmo | Controle de Absenteísmo | /absenteismo | (Módulo identificado no menu) |
| RH | Validação | Validação de Dados RH | /validacao | Buscar por nome ou matrícula, validar informações de colaboradores |
| Comunicação | Quadro de Avisos | Sistema de Comunicação Interna | /quadro-avisos | Criar novo aviso, buscar avisos, filtrar por status, editar, excluir, desativar avisos |
| Manutenção | Controle Portaria | Registro de Acesso | /controle-portaria | (Módulo identificado no menu) |
| Manutenção | OS Manutenção | Gestão de Ordens de Serviço | /os-manutencao | Listar OS, filtrar por status/tipo/classificação/prioridade, solicitar manutenção, atualizar status, editar, excluir, ver detalhes |
| Logística | Logística | Gestão Logística | /logistica | Dashboard, Lançamentos, Histórico, Transportadoras, Relatórios, Configurações |
| Cadastro | Cadastros Gerais | Gestão de Dados Mestres | /cadastros | Gerenciar filiais, setores, cargos, etc. |
| Administrativo | Feriados | Calendário de Feriados | /feriados | Visualizar por ano, importar feriados nacionais, criar novo feriado |
| Administrativo | Permissões | Gestão de Perfis e Acessos | /permissoes | Gerenciar perfis de acesso, definir permissões por módulo |
| Administrativo | Usuários Online | Monitoramento de Sessões | /usuarios-online | Visualizar sessões ativas, detalhes de login, atividades recentes |

## Detalhamento por Módulo

### 1. Dashboard
- **Indicadores visíveis**: Total Planejado, Total Realizado, Produtividade Geral, Gap Geral, Dias Críticos, Top Colaborador
- **Status dos Colaboradores**: 469 Ativos, 1 em Férias, 0 Afastados, 0 Suspensos, 17 Desligados
- **Manutenção Fábrica**: 25 OS em Aberto, 191 Total Registradas, 160 Concluídas (84% resolvidas)
- **Aniversariantes do Mês**: Lista detalhada com nomes e datas (ex: Madalena de Souza em 01/09, Alisson Ferreira em 01/09)

### 2. Colaboradores (RH)
- **Total de funcionários**: 469 encontrados
- **Filtros disponíveis**:
  - Status: Todos, Ativo, Férias, Suspenso, Afastado, Desligado
  - Setor: Mais de 20 opções (Administrativo, Almoxarifado, Cola por Colaborador, Compras, Corte, Costura, Dobra, Dobra(Embalagem), Dobra(Revisão), Embalagem Estéril, Embalagem Não Estéril, Engenharia, Etiquetagem, Etiquetagem Estéril, Expedição, Financeiro, Jovem Aprendiz, Logística, Manutenção, Marketing, Obra, Pacote, Pacote Auxiliar, Pacote Flutuantes, Pacote Kit, Pacote Oftalmo, PCP, Qualidade, RH, Serviços Gerais, TI, Vendas)
  - Filial: Todas Filiais, Matriz
- **Colunas da lista**: Funcionário, Filial, Departamento, Setor, Cargo, Tipo de Acesso, Status, Ações
- **Ações por registro**: Editar, Excluir
- **Botões principais**: Novo, Colaboradores, Administradores
- **Campo de busca**: "Buscar funcionário..."

### 3. Escala do Mês (RH)
- **Funcionalidades**: Visualizar escalas existentes, duplicar escala anterior, criar nova escala
- **Status**: "Nenhuma escala selecionada" (padrão inicial)

### 4. Controle de Ponto (RH)
- **Funcionalidades**: 
  - Upload de planilha de ponto (com seletor de arquivo e botão "Fazer Upload")
  - Debug Planilha
  - Excluir Marcações do Mês
  - Exportar para Excel
  - Exportar Todos (quando houver dados)
  - Visualização de Saldo de Horas por Colaborador
- **Filtros**:
  - Local de Trabalho (seletor)
  - Dia/Mês/Ano (spinbuttons)
  - Todos os Locais / Selecionar Local
  - Todas as Tags / Tags específicas (Sem Vale Alimentação, Compensação Empresa, Declaração Médica, Falta sem Justificativa)
  - Pesquisar colaborador por nome
- **Colunas**: COLABORADOR, REGISTROS, SALDO TOTAL, AÇÃO

### 5. Validação (RH)
- **Funcionalidade**: Validação de Dados RH
- **Interface**: Campo de busca "Buscar por nome ou matrícula..."

### 6. Quadro de Avisos (Comunicação)
- **Funcionalidades**:
  - Novo Aviso (botão de criação)
  - Buscar avisos (campo de texto)
  - Filtrar por status (Todos os Status, Ativos, Inativos)
  - Editar, Excluir, Desativar avisos existentes
- **Exemplo de aviso**: "teste" com indicador "-12 de 1 faltam visualizar"

### 7. OS Manutenção (Manutenção)
- **Funcionalidades**:
  - Lista de OS com filtros avançados
  - Dashboard da manutenção
  - Exportar dados
  - Solicitação de Manutenção
- **Filtros disponíveis**:
  - Status: Todos, Aberto, Agendado, Em Andamento, Aguardando Peça, Concluído, Cancelado
  - Tipo: Todos, Elétrica, Mecânica, Melhoria, Operacional, Projeto
  - Classe: Todas, Operação (erro humano/procedimento), Manutenção (execução/instalação), Projeto/Equipamento (defeito/desgaste)
  - Prioridade: Todas, Baixa, Média, Alta, Crítica
- **Busca**: Por título, número, equipamento, local
- **Ações por OS**: Ver detalhes, Atualizar Status, Editar, Excluir
- **Exemplos de OS encontradas**:
  - "Esteira parou!" (Manual não cadastrado)
  - "Máquina Overlock" (com opções de Aprovar/Rejeitar, Ver detalhes, Atualizar Status, Editar, Excluir)
  - "Tesoura de fim de enfesto" (similar à Overlock)

### 8. Logística (Gestão de Fretes)
- **Sub-módulos**: Dashboard, Lançamentos, Histórico, Transportadoras, Relatórios, Configurações
- **Dashboard**:
  - Indicadores: Evolução Mensal 2026 (SLA: Atrasados, Enviados, No Prazo, SLA %)
  - Mapas: Envios por UF - Evolução 2026 (dados por estado brasileiro)
  - Últimos Lançamentos: Tabela com Data, NF, Cliente, Transportadora, Frete, Status, Ação
- **Lançamentos**:
  - Funcionalidades: Importar CSV, Limpar Todos, Novo Lançamento
  - Tabela de lançamentos recentes: Data, NF, Cliente, Transportadora, Valor do Frete, Status, Ações
  - Status observados: Em Transporte, Entregue no Prazo
- **Histórico**:
  - Funcionalidades: Exportar CSV, busca por cliente/NF/transportadora
  - Filtros: Status (Todos, Em Transporte, Entregue no Prazo, Entregue com Atraso, Atrasado, Cancelado)
  - Filtro de data: seletor de período (Dia, Mês, Ano com botão "Mostrar seletor de datas")
  - Tabela: Data, NF, Cliente, Transportadora, Frete (%), Status, Ação
- **Transportadoras**:
  - Funcionalidade: Nova Transportadora
  - Lista de transportadoras: TRANSP. ATIVA, TRANSP. BRASPRESS, TRANSP. CORREIO, TRANSP. GENEROSO, TRANSP. JAMEF, TRANSP. MODULAR, TRANSP. OXIETO
  - Status: Ativo/Inativo (botão toggle)
- **Relatórios**:
  - Funcionalidade: Exportar (disabled quando sem dados)
  - Filtros: Período (Dia/Mês/Ano com seletores)
  - Agrupamento por: Transportadora (padrão), Cliente, UF, Mês

### 9. Cadastros Gerais
- **Funcionalidade**: Gestão de Dados Mestres
- **Tela inicial**: Filiais
  - Colunas: NOME FANTASIA, RAZAO SOCIAL, STATUS, AÇÕES
  - Registros encontrados: 
    - Matriz (Ativo)
    - MULTI PROTEC LTDA (Ativo)
  - Ações por filial: Editar, Excluir
  - Botão principal: Adicionar Filial
- **Subcadastros acessíveis via menu expandido**:
  - Filiais
  - Locais
  - Divisões
  - Funções
  - Equipes
  - Status
  - Horários de Turno
  - Opções de Dia
  - Categorias de Produtividade
  - Metas de Produtividade
  - Logo da Empresa
  - Manutenção de Fábrica
  - Performance Aderencia
  - Fornecedores
  - Dados de Refugo
  - Motivos de Refugo
  - Códigos de Ausência
  - Kits
  - Defeito Refugo

### 10. Feriados
- **Funcionalidade**: Calendário de Feriados
- **Filtros**: Ano (seletor com opções de 2024 a 2033, padrão 2026)
- **Ações**: Importar Feriados Nacionais, Novo Feriado
- **Visualização**: Calendário mensal expandível (Janeiro a Dezembro)
- **Funcionalidade por mês**: Visualizar feriados do mês, adicionar novos feriados específicos

### 11. Permissões
- **Funcionalidade**: Gestão de Perfis e Acessos
- **Perfis pré-definidos**: Administrador, Gestor, Colaborador, Lider Produção, Equipe Manutenção, Supervisor de Manutenção, Lider RH, Visualizador de Produção, Colaborador + Abertura de OS, Qualidade - Refugo
- **Ações**: Criar novo tipo de acesso, Somente Leitura, Acesso Total, Ocultar Tudo, Salvar Alterações
- **Matriz de permissões**: 
  - Colunas: MÓDULO, LEITURA, EDITAR, DELETAR, OCULTAR
  - Linhas: MENUS DO COLABORADOR (Meu Painel, Minha Escala, etc.) - padrão checkboxes para cada permissão

### 12. Usuários Online
- **Funcionalidade**: Monitoramento de Sessões Ativas
- **Tela**: Listagem de usuários atualmente logados no sistema
- **Informações fornecidas** (presumíveis baseado em padrão): Usuário, horário de login, IP, última ação, módulo acessado

## Observações Gerais de Navegação
- Sistema desenvolvido como SPA (Single Page Application) com navegação fluida entre módulos
- Menu lateral expansível/retrátil com ícones e texto
- Barra superior com informações do usuário logado (NICOLAS SANTOS - Assistente de Front-End Júnior)
- Funcionalidades de atualização automática indicadas por botões "Mover para cima/baixo" em alguns widgets
- Presença de indicadores visuais (cores como RED, labels de status)
- Sistema com dados reais em produção (469 colaboradores, 191 OS registradas)
- Arquitetura de permissões baseada em perfis com matriz granular de acesso por módulo
- Cada módulo do sistema possui permissões individuais para Leitura, Editar, Excluir e Ocultar
- O módulo de Permissões permite configurar essas permissões para cada perfil de acesso
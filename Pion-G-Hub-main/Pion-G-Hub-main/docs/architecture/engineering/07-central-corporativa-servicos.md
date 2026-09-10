# Central Corporativa de Serviços

## Visão

O Pion G Hub terá uma porta única corporativa para solicitação e acompanhamento de serviços internos.

O colaborador não deverá escolher qual setor acredita ser responsável.

Ele deverá escolher o serviço de que precisa.

O sistema será responsável por identificar e aplicar automaticamente:

- departamento responsável;
- equipe responsável;
- formulário correspondente;
- campos obrigatórios;
- regras condicionais;
- necessidade de aprovação;
- prioridade sugerida;
- SLA aplicável;
- fluxo de status;
- responsável ou fila inicial.

Não substituir essa experiência por um dropdown simples de departamentos.

## Experiência canônica

Registrar esta tela como requisito de produto:

# Como podemos ajudar?

Pesquisar um serviço...

## Tecnologia

- Problema no computador
- Solicitar acesso a sistema
- Instalar equipamento
- Internet ou telefone

## Marketing

- Solicitar criação de arte
- Solicitar material para evento
- Solicitar campanha
- Alteração no site

## Manutenção

- Abrir ordem de serviço
- Mover móvel ou equipamento
- Manutenção elétrica
- Manutenção hidráulica

## Compras

- Solicitar compra de material
- Solicitar contratação de serviço
- Solicitar cotação

## Recursos Humanos

- Solicitar documento
- Integração de colaborador
- Alteração cadastral

Essa lista é uma base inicial e poderá crescer, mas não deve ser descaracterizada.

## Princípio fundamental

"A solicitação é corporativa para quem solicita e departamental para quem executa."

Para o colaborador:

- Nova Solicitação;
- Minhas Solicitações;
- Aprovações Pendentes futuramente;
- acompanhamento unificado de qualquer demanda.

Para o departamento executor:

- fila especializada;
- triagem;
- responsáveis;
- indicadores;
- SLA;
- formulários e fluxos próprios;
- permissões específicas.

## Formulários especializados

Cada serviço pode possuir um formulário diferente.

Exemplos obrigatórios:

### Solicitação de arte

Possíveis campos:

- tipo de peça;
- objetivo;
- público-alvo;
- texto principal;
- canal;
- dimensões;
- data necessária;
- referências;
- anexos;
- aprovador.

Fluxo possível:

Solicitado
→ Briefing em análise
→ Em produção
→ Aguardando aprovação
→ Ajustes
→ Concluído

### Movimentação de móvel ou equipamento

Possíveis campos:

- local atual;
- local de destino;
- item;
- quantidade;
- data desejada;
- necessidade de desmontagem;
- equipamento elétrico envolvido;
- foto do local;
- observações.

### Manutenção elétrica

Possíveis campos:

- local;
- equipamento ou instalação;
- problema identificado;
- risco imediato;
- equipamento parado;
- fotos ou vídeos.

### Acesso a sistema

Possíveis campos:

- sistema;
- tipo de acesso;
- colaborador beneficiado;
- perfil solicitado;
- gestor aprovador;
- data necessária;
- justificativa.

### Problema em equipamento de TI

Possíveis campos:

- equipamento;
- patrimônio;
- descrição;
- quando o problema começou;
- impacto no trabalho;
- foto ou print.

Campos podem ser condicionais.

Exemplo:

Se "Solicitação urgente = Sim":

- exigir justificativa;
- exigir gestor autorizador;
- aplicar regra específica de prioridade.

## Arquitetura conceitual

Camada corporativa comum:

Solicitação Corporativa:

- número;
- solicitante;
- serviço solicitado;
- departamento responsável;
- equipe responsável;
- status geral;
- prioridade;
- SLA;
- prazo;
- responsável atual;
- anexos;
- histórico;
- referência para processo especializado.

Processos especializados:

- Chamado de TI;
- Ordem de Serviço;
- Solicitação de Arte;
- Solicitação de Compra;
- Solicitação de RH;
- outros processos futuros.

A camada comum não deve substituir os dados especializados de cada módulo.

Exemplos:

- Ordem de Serviço possui equipamentos, localização, peças e execução;
- Solicitação de Arte possui briefing, formatos, aprovação e revisões;
- Compras possui orçamento, cotação e aprovações;
- TI possui ativos, acessos, impacto e diagnóstico.

## Catálogo de serviços

Cada serviço deverá possuir metadados como:

- identificador;
- nome;
- descrição;
- palavras-chave para busca;
- ícone;
- departamento responsável;
- equipe responsável;
- formulário;
- fluxo;
- SLA;
- prioridade padrão;
- aprovação necessária;
- status ativo/inativo;
- ordem de exibição;
- público autorizado.

A pesquisa deve encontrar o serviço por necessidade.

Exemplo:

Usuário pesquisa:

"mover mesa"

Resultado:

Manutenção → Mover móvel ou equipamento

## Formulários dinâmicos

Visão futura: administradores autorizados poderão configurar:

- campos;
- obrigatoriedade;
- opções;
- validações;
- campos condicionais;
- anexos;
- aprovadores;
- etapas;
- SLA;
- regras de roteamento.

Tipos de campo previstos:

- texto;
- texto longo;
- número;
- data;
- seleção;
- múltipla escolha;
- usuário;
- departamento;
- equipamento;
- anexo;
- aprovação;
- campo condicional.

Não implementar nesta Sprint.

## Experiência unificada

Exemplo de "Minhas Solicitações":

```
SOL-00125 | Criação de arte     | Marketing  | Em produção
SOL-00126 | Computador sem rede | TI         | Em atendimento
SOL-00127 | Mover mesa          | Manutenção | Programada
SOL-00128 | Compra de monitor   | Compras    | Aguardando aprovação
```

O colaborador deve acompanhar todas as demandas em uma única experiência, mesmo que os processos internos sejam diferentes.

## Fases da Epic

Roadmap aprovado:

### Fase 1 — Catálogo de Serviços

- catálogo visual;
- pesquisa;
- departamentos;
- equipes;
- serviços ativos.

### Fase 2 — Formulários Dinâmicos

- campos configuráveis;
- obrigatoriedade;
- condicionais;
- anexos;
- validações.

### Fase 3 — Roteamento

- departamento;
- equipe;
- fila;
- responsável;
- regras automáticas.

### Fase 4 — Aprovações e SLA

- aprovadores;
- prazos;
- prioridade;
- escalonamento;
- alertas.

### Fase 5 — Portais Departamentais

- TI;
- Marketing;
- Manutenção;
- Compras;
- RH;
- outros.

### Fase 6 — Indicadores Corporativos

- volume;
- tempo de atendimento;
- SLA;
- gargalos;
- demanda por departamento;
- satisfação interna.

## Relação com a Sprint 5.1

A Sprint 5.1 não implementará esse motor.

Nesta Sprint:

- Nova Solicitação de TI permanece usando `/ti/novo`;
- Minhas Solicitações permanece usando `/ti?view=solicitacoes`;
- ambas aparecem visualmente na área Corporativa;
- Central de Atendimento permanece na área Departamento de TI;
- rotas atuais são preservadas;
- banco não será alterado;
- a navegação será preparada para a evolução futura.

Não renomear ainda as rotas para `/solicitacoes`.

## Limites arquiteturais

- não generalizar `ti_chamados` prematuramente;
- não forçar todos os departamentos a usar o mesmo fluxo;
- não misturar autorização com organização visual;
- PBAC continua controlando acesso;
- cada departamento mantém regras próprias;
- dados sensíveis continuam isolados;
- catálogo corporativo não concede acesso operacional ao departamento.

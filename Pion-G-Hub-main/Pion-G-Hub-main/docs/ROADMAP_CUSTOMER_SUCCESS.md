# PION G HUB — ROADMAP CUSTOMER SUCCESS

**Epic / Macro Sprint:** 6.0 — Customer Success
**Status:** APROVADO PARA EXECUÇÃO
**Área:** Customer Success
**Data da aprovação:** 10/08/2026
**Natureza:** Roadmap evolutivo
**Documento pai:** `docs/ROADMAP_PION_G_HUB.md`

> **Nota de governança (adicionada na formalização deste documento):** este
> roadmap formaliza o **desenho funcional e arquitetural** da Sprint 6.0 —
> o critério de conclusão da Sprint 6.0 registrado em
> `docs/ROADMAP_PION_G_HUB.md` (Seção 5) exigia exatamente isto: "desenho
> funcional/arquitetural fechado e aprovado, com a decomposição em
> subsprints (6.1, 6.2, 6.3...) registrada em documento próprio". Este
> documento é esse registro.
>
> Aprovação do desenho **não** revoga o Hard Stop já registrado no Roadmap
> Oficial (`docs/ROADMAP_PION_G_HUB.md`, Seção 4): nenhuma sprint nova —
> inclusive a 6.1 — pode iniciar **desenvolvimento** formalmente antes do
> encerramento formal da Sprint 5.1.1 (Smoke Test em Produção, confirmação
> de rollback/contingência e documentação de encerramento, todos ainda
> pendentes). "Aprovado para execução" refere-se à aprovação do desenho;
> a autorização para começar a Sprint 6.1 em si segue condicionada a esse
> encerramento, conforme a regra geral de governança do projeto (fluxo de
> 18 passos, Seção 2 do Roadmap Oficial).

---

# Sprint 6.0 — Customer Success

## Objetivo

Criar dentro do PION G HUB uma área própria de Customer Success capaz de centralizar o acompanhamento pós-venda dos clientes, registrar interações, identificar clientes que necessitam de atenção, estruturar planos de ação e gerar indicadores para operação e gestão.

O desenvolvimento será incremental.

Cada Sprint 6.x deverá entregar uma parte utilizável do módulo, permitindo que o processo seja validado com usuários reais e redesenhado quando necessário.

A evolução funcional baseada no uso real é considerada parte natural do projeto.

---

# Regra de entrada dos clientes

## Fase inicial

A entrada de clientes na carteira de Customer Success será **manual**.

O usuário autorizado poderá selecionar ou cadastrar o vínculo de um cliente com a área de CS e definir seu responsável.

Não haverá nesta primeira etapa dependência de integração automática com sistemas externos.

## Evolução futura

Posteriormente, o processo será automatizado através de integração com:

* NOMUS;
* RD Station;
* ou ambos, conforme a arquitetura que for considerada mais adequada.

A regra desejada é identificar clientes que já possuem venda e inseri-los automaticamente na operação de Customer Success.

A fonte oficial desse dado será definida somente na Sprint de integração.

Não duplicaremos dados desnecessariamente no PION G HUB.

---

# Princípios do módulo

O Customer Success será responsável pelo acompanhamento pós-venda do cliente.

O módulo deverá permitir responder rapidamente:

* quem são os clientes acompanhados pelo CS;
* quem é responsável por cada cliente;
* quando ocorreu o último contato;
* qual será a próxima ação;
* quais clientes estão em atenção;
* quais clientes apresentam riscos;
* quais problemas estão pendentes;
* quais planos de ação estão em andamento;
* quais clientes estão sem acompanhamento;
* quais problemas foram efetivamente resolvidos.

O CS deverá funcionar como uma **ferramenta operacional**, e não apenas como dashboard.

---

# Fronteiras funcionais

O módulo de CS não substituirá processos pertencentes a outros departamentos.

**Marketing**

Continua responsável pela criação e gestão de pesquisas e suas respostas.

O CS poderá utilizar essas respostas como sinais de satisfação ou insatisfação.

**Comercial**

Continua responsável por prospecção, negociação, oportunidade e fechamento.

**Qualidade**

Continua responsável pelos processos formais de qualidade e não conformidade.

**Logística**

Continua responsável pelas operações relacionadas a entregas e transportes.

**Financeiro**

Continua responsável pelos processos financeiros e de crédito.

**Customer Success**

Será responsável pelo acompanhamento, relacionamento, identificação de risco, registro das interações e condução dos planos de ação relacionados à experiência do cliente.

---

# ROADMAP DA SPRINT 6.x

## Sprint 6.1 — Fundação do Customer Success

### Objetivo

Criar a base funcional mínima para o CS começar a operar dentro do PION G HUB.

### Entregas previstas

* workspace Customer Success;
* permissões iniciais;
* carteira de clientes;
* inclusão manual de cliente na carteira;
* atribuição de responsável;
* status do relacionamento;
* classificação inicial do cliente;
* tela de listagem;
* filtros básicos;
* estrutura inicial da página do cliente;
* histórico de alterações;
* auditoria das principais ações.

### Resultado esperado

O CS consegue criar sua carteira dentro do Hub e determinar quem acompanha cada cliente.

---

## Sprint 6.2 — Cliente 360° e Acompanhamentos

### Objetivo

Transformar o cadastro do cliente em um ponto central de acompanhamento.

### Entregas previstas

Página 360° contendo:

* informações gerais;
* responsável pelo CS;
* vendedor relacionado;
* contatos;
* status;
* último acompanhamento;
* próxima ação;
* histórico.

Registro de interações:

* ligação;
* WhatsApp;
* e-mail;
* reunião;
* visita;
* contato interno;
* tentativa de contato;
* observação.

Cada interação deverá permitir registrar:

* data;
* responsável;
* resumo;
* resultado;
* próxima ação;
* prazo da próxima ação.

### Resultado esperado

Todo relacionamento realizado pelo CS passa a possuir histórico dentro do PION G HUB.

---

## Sprint 6.3 — Alertas, Riscos e Clientes em Atenção

### Objetivo

Permitir que o CS identifique clientes que necessitam de ação.

### Classificação inicial

* Saudável;
* Atenção;
* Em risco;
* Crítico;
* Inativo.

Mudanças de classificação deverão possuir motivo registrado.

### Exemplos de alertas

* pesquisa negativa;
* reclamação recorrente;
* atraso;
* problema de qualidade;
* ausência prolongada de contato;
* redução percebida de relacionamento;
* cliente sem acompanhamento;
* ocorrência registrada manualmente.

### Bloco principal

Criar o conceito de:

**Clientes em Atenção**

A lista deverá destacar clientes que possuam combinações de:

* insatisfação;
* reincidência;
* ação vencida;
* problema não resolvido;
* ausência de acompanhamento.

### Resultado esperado

O CS deixa de trabalhar apenas de forma reativa e passa a possuir uma fila de atenção priorizada.

---

## Sprint 6.4 — Planos de Ação

### Objetivo

Transformar problemas identificados em acompanhamento estruturado.

### Estrutura

Um plano de ação poderá possuir:

* cliente;
* problema identificado;
* impacto;
* responsável;
* departamentos envolvidos;
* prioridade;
* prazo;
* tarefas;
* comentários;
* anexos;
* evidências;
* resultado esperado;
* conclusão.

### Estados previstos

* Aberto;
* Em andamento;
* Aguardando;
* Concluído;
* Cancelado.

### Resultado esperado

Problemas deixam de depender exclusivamente de conversas, WhatsApp ou memória individual.

---

## Sprint 6.5 — Pesquisas + Customer Success

### Objetivo

Conectar o processo existente de pesquisas do Marketing com a operação de Customer Success.

### Fluxo esperado

Marketing cria pesquisa.

↓

Cliente responde.

↓

Resposta permanece pertencendo ao Marketing.

↓

Sistema identifica condição de atenção.

↓

Um alerta é gerado no CS.

↓

CS analisa.

↓

Responsável entra em contato com o cliente.

↓

Interação é registrada.

↓

Quando necessário, um plano de ação é criado.

↓

Problema é acompanhado.

↓

Alerta é encerrado com conclusão documentada.

### Regra importante

O CS não poderá editar a resposta original fornecida pelo cliente.

---

## Sprint 6.6 — Dashboard Operacional e Executivo

### Objetivo

Dar visibilidade sobre a operação de Customer Success.

### Indicadores inicialmente aprovados

* total de clientes acompanhados;
* clientes em atenção;
* clientes em risco;
* clientes críticos;
* divergências no mês;
* pesquisas de satisfação;
* clientes insatisfeitos;
* clientes com mais de três divergências;
* comparação mensal do índice de satisfação;
* tempo médio de resolução;
* alertas acima de 48 horas;
* próximas ações vencidas;
* planos de ação em aberto;
* clientes sem acompanhamento recente.

### Blocos operacionais

**Clientes que precisam de atenção hoje**

**Ações atrasadas**

**Novos alertas**

**Clientes sem contato recente**

**Planos próximos do vencimento**

**Últimas interações**

### Resultado esperado

A operação diária e a gestão do CS passam a ter uma visão única dentro do Hub.

---

## Sprint 6.7 — Integração de Clientes NOMUS / RD

### Objetivo

Eliminar gradualmente a necessidade de inclusão manual de clientes.

### Fontes candidatas

**NOMUS**

Utilização da base de clientes/pessoas e informações de vendas disponíveis no ERP.

**RD Station**

Utilização do relacionamento comercial/CRM quando tecnicamente e funcionalmente adequado.

### Regra desejada

Clientes identificados como possuindo venda poderão entrar automaticamente na base acompanhada pelo CS.

A arquitetura deverá decidir:

* sistema mestre do cliente;
* critério de entrada;
* sincronização;
* atualização;
* tratamento de duplicidade;
* clientes inativos;
* alteração cadastral;
* falha de integração.

### Hard stop

Não desenvolver integração apenas por conveniência técnica.

Antes da implementação deverá ser definido qual sistema possui o dado mais confiável para determinar que aquele cliente efetivamente deve entrar no CS.

---

## Sprint 6.8 — Inteligência de Customer Success

### Status

FUTURA.

### Possibilidades

Após acumularmos dados reais de utilização:

* Health Score;
* identificação automática de risco;
* queda de recorrência de compra;
* redução de faturamento;
* recorrência de reclamações;
* clientes sem relacionamento;
* tendência de insatisfação;
* sugestões de próxima ação;
* priorização automática da carteira.

### Regra

Não será criado Health Score artificial antes de termos dados suficientes para fundamentá-lo.

---

# Evolução da experiência

O roadmap da Sprint 6.x não deve ser considerado uma especificação imutável.

Ao final de cada Sprint:

1. validar tecnicamente;
2. validar com usuários;
3. observar dificuldades reais;
4. registrar feedback;
5. revisar o fluxo;
6. ajustar o roadmap seguinte quando necessário;
7. documentar a decisão.

Mudanças deverão ser controladas e documentadas, evitando alteração aleatória de escopo durante uma Sprint já iniciada.

---

# Arquitetura funcional inicial

A navegação prevista para a área será:

**Customer Success**

Dashboard

Minha Carteira

Todos os Clientes

Acompanhamentos

Alertas e Riscos

Planos de Ação

Indicadores

Configurações

Essa estrutura poderá evoluir conforme as primeiras Sprints forem utilizadas.

---

# Integração com outras áreas

O desenho deverá privilegiar vínculos entre registros em vez de duplicação de processos.

Exemplo:

Uma pesquisa pertence ao Marketing.

Um problema de qualidade pertence à Qualidade.

Uma venda pertence ao processo Comercial/ERP.

Uma entrega pertence à Logística.

O Customer Success deverá conseguir enxergar esses sinais dentro da visão do cliente sem necessariamente assumir a propriedade do processo original.

---

# Ordem oficial de desenvolvimento

**Sprint 6.0 — Customer Success**
Epic aprovada.

**Sprint 6.1 — Fundação e Carteira Manual**
Primeira Sprint executável.

**Sprint 6.2 — Cliente 360° e Acompanhamentos**

**Sprint 6.3 — Alertas, Riscos e Clientes em Atenção**

**Sprint 6.4 — Planos de Ação**

**Sprint 6.5 — Integração com Pesquisas**

**Sprint 6.6 — Dashboard Operacional e Executivo**

**Sprint 6.7 — Entrada Automática NOMUS / RD**

**Sprint 6.8 — Inteligência e Health Score**
Futura.

---

# Processo obrigatório de execução

Cada uma das Sprints acima deverá respeitar integralmente o processo de desenvolvimento adotado pelo PION G HUB:

Desenvolvimento em branch isolada → revisão técnica → build/testes locais → SQL somente em HML quando aplicável → validação HML → limpeza de dados de teste → documentação → revisão final → commit/push → Pull Request → checks/review → merge → deploy frontend → migrations em Produção → smoke test Produção → rollback/contingência → encerramento formal.

Somente após o encerramento formal será permitido iniciar a Sprint seguinte.

**Adicionalmente** (regra geral do Roadmap Oficial, `docs/ROADMAP_PION_G_HUB.md`, Seção 4): a Sprint 6.1 — primeira Sprint executável desta frente — não pode iniciar formalmente enquanto a Sprint 5.1.1 não estiver encerrada (Smoke Produção, rollback/contingência e documentação de encerramento).

---

# Decisão registrada — 10/08/2026

O desenho inicial do módulo de Customer Success está **APROVADO**.

Foi decidido que:

* Customer Success será a frente **Sprint 6.0 do PION G HUB**;
* a primeira versão utilizará inclusão manual dos clientes;
* a automação de entrada através de NOMUS e/ou RD Station ficará para uma Sprint posterior;
* pesquisas continuarão pertencendo ao Marketing;
* o CS utilizará informações de outros departamentos sem necessariamente assumir seus processos;
* o desenvolvimento será incremental;
* o desenho poderá evoluir conforme aprendizado operacional;
* alterações estruturais deverão ser documentadas;
* nenhuma integração complexa será antecipada antes da validação do processo básico.

## Próxima Sprint

**Sprint 6.1 — Fundação do Customer Success e Carteira Manual.**

Essa será a primeira implementação da frente, **condicionada ao encerramento formal da Sprint 5.1.1** (ver nota de governança no início deste documento).

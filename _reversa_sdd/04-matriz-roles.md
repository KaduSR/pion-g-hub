# Matriz de Roles e Permissões do PionG Plus

| Role/Perfil | Departamento | Módulos Acessíveis | Permissões Específicas | Observações |
|---|---|---|---|---|
| Administrador | Administrativo | Todos os módulos | Acesso Total (Leitura, Edição, Exclusão, Ocultação em todos os módulos) | Perfil com privilégios máximos do sistema - CONFIRMADO via login nicolas.santos@piong.com.br |
| Gestor | Administrativo/Produção | Dashboard, Produção, Relatórios, OS Manutenção, Logística | Leitura em todos, Edição em módulos específicos | Perfil de gestão operacional |
| Colaborador | RH | Colaboradores (próprio registro), Escala do Mês, Controle de Ponto, Vale Transporte/Refeição | Leitura e edição limitada ao próprio perfil | Perfil padrão de funcionário |
| Lider Produção | Produção | Ordens de Produção, Apontamento, Indicadores de Produção, Relatórios | Leitura total, Edição em módulos de produção | Líder de linha de produção |
| Equipe Manutenção | Manutenção | OS Manutenção (visualização e atualização), Controle Portaria | Leitura e edição em OS atribuídas, Visualização de portaria | Técnicos de manutenção |
| Supervisor de Manutenção | Manutenção | OS Manutenção (gestão completa), Relatórios de Manutenção, Configurações | Leitura e edição total em manutenção | Supervisor da equipe de manutenção |
| Lider RH | RH | Colaboradores (gestão completa), Escala do Mês, Validação, Feriados, Permissões (limitada) | Leitura e edição total em RH | Líder do departamento de RH |
| Visualizador de Produção | Produção | Dashboard de Produção, Relatórios, Indicadores | Apenas leitura em módulos de produção | Perfil de consulta apenas |
| Colaborador + Abertura de OS | RH/Manutenção | Colaboradores (próprio), OS Manutenção (abertura somente) | Leitura próprio perfil, Criação de OS | Funcionário que pode solicitar manutenção |
| Qualidade - Refugo | Qualidade | Controle de Qualidade, Registro de Refugo, Relatórios | Leitura e edição em módulos de qualidade | Controle de qualidade e gestão de refugo |
| Somente Leitura | Variável | Configurado por administrador | Leitura em módulos selecionados | Perfil customizável para consultores/auditores |
| Acesso Total | Variável | Configurado por administrador | Leitura, Edição, Exclusão em módulos selecionados | Perfil customizável para usuários avançados |
| Ocultar Tudo | Variável | Configurado por administrador | Nenhum acesso (todos os módulos ocultos) | Perfil restrictivo para contingências |

## Detalhamento de Permissões por Módulo (Matriz Geral - CONFIRMADO)

### Permissões do Usuário Administrador (nicolas.santos@piong.com.br):

| Módulo | Leitura | Editar | Deletar | Ocultar |
|--------|---------|--------|---------|---------|
| Meu Painel | ❌ | ❌ | ❌ | ✅ |
| Minha Escala | ❌ | ❌ | ❌ | ✅ |
| Holerites e Ponto | ❌ | ❌ | ❌ | ✅ |
| Produtividade | ❌ | ❌ | ❌ | ✅ |
| Sugestoes | ❌ | ❌ | ❌ | ✅ |
| Documentos | ❌ | ❌ | ❌ | ✅ |
| **Dashboard** | ✅ | ✅ | ✅ | ✅ |
| **Colaboradores** | ✅ | ✅ | ✅ | ✅ |
| **Escala do Mes** | ✅ | ✅ | ✅ | ✅ |
| **Controle de Ponto** | ✅ | ✅ | ✅ | ✅ |
| **Produtividade Equipe** | ✅ | ✅ | ✅ | ✅ |
| **Absenteismo** | ✅ | ✅ | ✅ | ✅ |
| **Portaria** | ✅ | ✅ | ✅ | ✅ |
| **Controle Portaria** | ✅ | ✅ | ✅ | ✅ |
| **Validacao** | ✅ | ✅ | ✅ | ✅ |
| **Quadro de Avisos** | ✅ | ✅ | ✅ | ✅ |
| **Manutencao OS** | ✅ | ✅ | ✅ | ✅ |
| **- OS Manutencao - Abrir OS** | ✅ | ✅ | ✅ | ✅ |
| **- OS Manutencao - Agenda de Preventivas** | ✅ | ✅ | ✅ | ✅ |
| **- OS Manutencao - Relatorios** | ✅ | ✅ | ✅ | ✅ |
| **- OS Manutencao - Dashboard** | ✅ | ✅ | ✅ | ✅ |
| **Logistica** | ✅ | ✅ | ✅ | ✅ |
| **- Expedicao** | ✅ | ✅ | ✅ | ✅ |
| **- Gestao de Frete** | ✅ | ✅ | ✅ | ✅ |
| **Cadastros** | ✅ | ✅ | ✅ | ✅ |
| **- Filiais** | ✅ | ✅ | ✅ | ✅ |
| **- Locais** | ✅ | ✅ | ✅ | ✅ |
| **- Divisoes** | ✅ | ✅ | ✅ | ✅ |
| **- Funcoes** | ✅ | ✅ | ✅ | ✅ |
| "- Equipes" | ✅ | ✅ | ✅ | ✅ |
| "- Status" | ✅ | ✅ | ✅ | ✅ |
| "- Horarios de Turno" | ✅ | ✅ | ✅ | ✅ |
| "- Opcoes de Dia" | ✅ | ✅ | ✅ | ✅ |
| "- Categorias Produtividade" | ✅ | ✅ | ✅ | ✅ |
| "- Metas Produtividade" | ✅ | ✅ | ✅ | ✅ |
| "- Logo da Empresa" | ✅ | ✅ | ✅ | ✅ |
| "- Manutencao Fabrica" | ✅ | ✅ | ✅ | ✅ |
| "- Performance Aderencia" | ✅ | ✅ | ✅ | ✅ |
| "- Fornecedores" | ✅ | ✅ | ✅ | ✅ |
| "- Dados de Refugo" | ✅ | ✅ | ✅ | ✅ |
| "- Motivos de Refugo" | ✅ | ✅ | ✅ | ✅ |
| "- Codigos Ausencia" | ✅ | ✅ | ✅ | ✅ |
| "- Kits" | ✅ | ✅ | ✅ | ✅ |
| "- dm:refugo_defeitos" | ✅ | ✅ | ✅ | ✅ |
| **Feriados** | ✅ | ✅ | ✅ | ✅ |
| **Usuarios Online** | ✅ | ✅ | ✅ | ✅ |
| **Permissoes** | ✅ | ✅ | ✅ | ✅ |

*Legend: ✅ = Permissão concedida, ❌ = Permissão negada*

### MENUS DO COLABORADOR
| Funcionalidade | Leitura | Editar | Excluir | Ocultar |
|---|---|---|---|---|
| Meu Painel | ✓ | ✗ | ✗ | ✓ |
| Minha Escala | ✓ | ✗ | ✗ | ✓ |
| Holerites e Ponto | ✓ | ✗ | ✗ | ✓ |
| Produtividade | ✓ | ✗ | ✗ | ✓ |
| Sugestões | ✓ | ✓ | ✗ | ✓ |
| Documentos | ✓ | ✓ | ✗ | ✓ |

### MENUS ADMINISTRATIVOS
| Funcionalidade | Leitura | Editar | Excluir | Ocultar |
|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✗ | ✓ |
| Colaboradores | ✓ | ✓ | ✗ | ✓ |
| Escala do Mês | ✓ | ✓ | ✗ | ✓ |
| Controle de Ponto | ✓ | ✓ | ✗ | ✓ |
| Produtividade Equipe | ✓ | ✓ | ✗ | ✓ |
| Absenteísmo | ✓ | ✓ | ✗ | ✓ |
| Portaria | ✓ | ✓ | ✗ | ✓ |
| Controle Portaria | ✓ | ✓ | ✗ | ✓ |
| Validação | ✓ | ✓ | ✗ | ✓ |
| Quadro de Avisos | ✓ | ✓ | ✗ | ✓ |
| Manutenção OS | ✓ | ✓ | ✗ | ✓ |
| Logística | ✓ | ✓ | ✗ | ✓ |
| Cadastros | ✓ | ✓ | ✗ | ✓ |
| Feriados | ✓ | ✓ | ✗ | ✓ |
| Usuários Online | ✓ | ✓ | ✗ | ✓ |
| Permissões | ✓ | ✓ | ✗ | ✓ |

### CADASTROS
| Funcionalidade | Leitura | Editar | Excluir | Ocultar |
|---|---|---|---|---|
| Filiais | ✓ | ✓ | ✗ | ✓ |
| Locais | ✓ | ✓ | ✗ | ✓ |
| Divisão | ✓ | ✓ | ✗ | ✓ |
| Funções | ✓ | ✓ | ✗ | ✓ |
| Equipes | ✓ | ✓ | ✗ | ✓ |
| Status | ✓ | ✓ | ✗ | ✓ |
| Horários de Turno | ✓ | ✓ | ✗ | ✓ |
| Opções de Dia | ✓ | ✓ | ✗ | ✓ |
| Categorias de Produtividade | ✓ | ✓ | ✗ | ✓ |
| Metas de Produtividade | ✓ | ✓ | ✓ | ✗ |
| Logo da Empresa | ✓ | ✓ | ✗ | ✓ |
| Manutenção de Fábrica | ✓ | ✓ | ✗ | ✓ |
| Performance de Adesão | ✓ | ✓ | ✗ | ✓ |
| Fornecedores | ✓ | ✓ | ✗ | ✓ |
| Dados de Refugo | ✓ | ✓ | ✗ | ✓ |
| Motivos de Refugo | ✓ | ✓ | ✗ | ✓ |
| Códigos de Ausência | ✓ | ✓ | ✗ | ✓ |
| Kits | ✓ | ✓ | ✗ | ✓ |
| Defeito Refugo | ✓ | ✓ | ✗ | ✓ |

## Observações
- Sistema utiliza matriz de permissões granular por módulo e funcionalidade
- Perfis podem ser customizados através das opções "Criar novo tipo de acesso", "Somente Leitura", "Acesso Total" e "Ocultar Tudo"
- Ações em massa disponíveis: Salvar Alterações (habilitada após modificações)
- Estrutura híbrida: perfis pré-definidos + capacidade de customização avançada
- Controle visual através de checkboxes em grid de permissões (MÓDULO vs LEITURA/EDITAR/DELETAR/OCULTAR)
- Cada módulo do sistema possui permissões individuais para Leitura, Editar, Excluir e Ocultar
- O módulo de Permissões permite configurar essas permissões para cada perfil de acesso

## Validação em Tempo Real (Gestor Profile)
Validação realizada em 2026-09-03 para o perfil Gestor:
- Meu Painel: Leitura=Sim, Editar=Não, Excluir=Não, Ocultar=Sim
- Minha Escala: Leitura=Sim, Editar=Não, Excluir=Não, Ocultar=Sim
- Holerites e Ponto: Leitura=Sim, Editar=Não, Excluir=Não, Ocultar=Sim
- Produtividade: Leitura=Sim, Editar=Não, Excluir=Não, Ocultar=Sim
- Sugestões: Leitura=Sim, Editar=Sim, Excluir=Não, Ocultar=Sim
- Documentos: Leitura=Sim, Editar=Sim, Excluir=Não, Ocultar=Sim

## Validação em Tempo Real (Colaborador + Abertura de OS Profile)
Validação realizada em 2026-09-03 para o perfil Colaborador + Abertura de OS:
- Meu Painel: Leitura=Sim, Editar=Não, Excluir=Não, Ocultar=Sim
- Minha Escala: Leitura=Sim, Editar=Não, Excluir=Não, Ocultar=Sim
- Holerites e Ponto: Leitura=Sim, Editar=Não, Excluir=Não, Ocultar=Sim
- Produtividade: Leitura=Sim, Editar=Não, Excluir=Não, Ocultar=Sim
- Sugestões: Leitura=Sim, Editar=Sim, Excluir=Não, Ocultar=Sim
- Documentos: Leitura=Sim, Editar=Sim, Excluir=Não, Ocultar=Sim
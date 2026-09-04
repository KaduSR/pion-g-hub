# Matriz de Roles e Permissoes - PionG Blueprint

## Visao Geral

Este documento define a matriz de permissoes PBAC (Permission-Based Access Control) com suporte a RLS (Row Level Security) para o sistema PionG.

---

## Perfis de Acesso

| ID | Nome | Nivel | Descricao | Padrao |
|----|------|-------|-----------|--------|
| 1 | Administrador | 100 | Acesso total ao sistema | Nao |
| 2 | Gestor | 80 | Acesso gerencial com restricoes | Nao |
| 3 | Colaborador | 50 | Acesso basico | Sim |
| 4 | Lider Producao | 60 | Controle de producao | Nao |
| 5 | Equipe Manutencao | 40 | Gestao de OS | Nao |
| 6 | Supervisor Manutencao | 70 |Supervisao de manutencao | Nao |
| 7 | Lider RH | 75 | Gestao de RH | Nao |
| 8 | Visualizador Producao | 30 | Apenas visualizacao | Nao |
| 9 | Qualidad - Refugo | 45 | Controle de qualidade | Nao |
| 10 | Somente Leitura | 20 | Leitura apenas | Nao |
| 11 | Acesso Total | 100 | Acesso total (equivale a Admin) | Nao |
| 12 | Ocultar Tudo | 0 | Nenhum acesso | Nao |

---

## Modulos do Sistema

### Administrativo
| Codigo Modulo | Nome | Descricao |
|---------------|------|-----------|
| admin.dashboard | Dashboard | Painel administrativo |
| admin.colaboradores | Colaboradores | CADASTRO DE FUNCIONARIOS |
| admin.permissoes | Permissoes | Gerenciamento de perfis |
| admin.usuarios_online | Usuarios Online | Monitoramento de sessoes |
| admin.filiais | Filiais | Gerenciamento de filiais |
| admin.feriados | Feriados | Calendario de feriados |
| admin.controle_ponto | Controle de Ponto | Batidas e validacao |
| admin.escala_mes | Escala do Mes | Escala mensal |
| admin.validacao_ponto | Validacao de Ponto | Validacao de batidas |
| admin.quadro_avisos | Quadro de Avisos | Avisos e comunicados |
| admin.os_manutencao | OS Manutencao | Ordens de servico |

### Logistica
| Codigo Modulo | Nome | Descricao |
|---------------|------|-----------|
| logistica.dashboard | Dashboard | Painel logistico |
| logistica.lancamentos | Lancamentos | Registros de entrega |
| logistica.historico | Historico | Historico de entregas |
| logistica.transportadoras | Transportadoras | Cadastro de transportadoras |
| logistica.relatorios | Relatorios | Relatorios logisticos |
| logistica.configuracoes | Configuracoes | Configuracoes logisticas |

### Producao
| Codigo Modulo | Nome | Descricao |
|---------------|------|-----------|
| producao.dashboard | Dashboard | Painel de producao |
| producao.ordens | Ordens de Producao | Gestao de OPs |
| producao.apontamento | Apontamento | Registro de producao |
| producao.qualidade | Controle de Qualidade | Gestao de qualidade |
| producao.relatorios | Relatorios | Relatorios de producao |

---

## Acoes por Modulo

| Acao | Codigo | Descricao |
|------|--------|-----------|
| Listar | list | Visualizar lista |
| Ver Detalhe | read | Ver detalhes |
| Criar | create | Criar novo registro |
| Editar | update | Editar registro existente |
| Excluir | delete | Excluir registro |
| Exportar | export | Exportar dados |
| Ativar/Desativar | toggle | Ativar ou desativar |
| Validar | validate | Aprovar/rejeitar registro |
| Forcar Acao | force | Forcar acao especial |

---

## Matriz de Permissoes Detalhada

### Perfil: Administrador (nivel 100)
| Modulo | list | read | create | update | delete | export | toggle | validate | force |
|--------|------|------|--------|--------|--------|--------|--------|----------|-------|
| admin.* | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| logistica.* | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| producao.* | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Sim |

### Perfil: Gestor (nivel 80)
| Modulo | list | read | create | update | delete | export | toggle | validate | force |
|--------|------|------|--------|--------|--------|--------|--------|----------|-------|
| admin.dashboard | Sim | Sim | - | - | - | Sim | - | - | - |
| admin.colaboradores | Sim | Sim | Sim | Sim | Nao | Sim | Nao | Sim | Nao |
| admin.permissoes | Sim | Sim | Nao | Nao | Nao | Sim | - | - | - |
| admin.usuarios_online | Sim | Sim | - | - | - | Sim | - | Sim | Sim |
| admin.filiais | Sim | Sim | - | - | - | Sim | - | - | - |
| admin.feriados | Sim | Sim | - | - | - | Sim | - | - | - |
| admin.controle_ponto | Sim | Sim | Sim | Sim | Nao | Sim | - | Sim | Nao |
| admin.escala_mes | Sim | Sim | Sim | Sim | Nao | Sim | - | Sim | Nao |
| admin.validacao_ponto | Sim | Sim | - | Sim | - | Sim | - | Sim | - |
| admin.quadro_avisos | Sim | Sim | Sim | Sim | Sim | Sim | - | - | - |
| admin.os_manutencao | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Sim | - |
| logistica.* | Sim | Sim | Sim | Sim | Nao | Sim | - | Sim | - |
| producao.* | Sim | Sim | Sim | Sim | Nao | Sim | - | Sim | - |

### Perfil: Colaborador (nivel 50)
| Modulo | list | read | create | update | delete | export | toggle | validate | force |
|--------|------|------|--------|--------|--------|--------|--------|----------|-------|
| admin.dashboard | Sim | Sim | - | - | - | Nao | - | - | - |
| admin.colaboradores | Sua linha | Sua linha | Nao | Sua linha | Nao | Nao | - | - | - |
| admin.usuarios_online | Apenas propia | Apenas propia | - | - | - | Nao | - | - | - |
| admin.controle_ponto | Sim | Sim | Sim | Nao | Nao | Nao | - | - | - |
| admin.quadro_avisos | Sim | Sim | - | - | - | Nao | - | - | - |
| logistica.dashboard | Sim | Sim | - | - | - | Nao | - | - | - |
| logistica.lancamentos | Apenas propios | Apenas propios | Nao | Nao | Nao | Nao | - | - | - |
| producao.dashboard | Sim | Sim | - | - | - | Nao | - | - | - |
| producao.ordens | Apenas propias | Apenas propias | Nao | Nao | Nao | Nao | - | - | - |

### Perfil: Lider RH (nivel 75)
| Modulo | list | read | create | update | delete | export | toggle | validate | force |
|--------|------|------|--------|--------|--------|--------|--------|----------|-------|
| admin.dashboard | Sim | Sim | - | - | - | Sim | - | - | - |
| admin.colaboradores | Sim | Sim | Sim | Sim | Nao | Sim | Nao | Sim | Nao |
| admin.permissoes | Sim | Sim | Nao | Nao | Nao | Sim | - | - | - |
| admin.usuarios_online | Sim | Sim | - | - | - | Sim | - | - | - |
| admin.filiais | Sim | Sim | - | - | - | Sim | - | - | - |
| admin.feriados | Sim | Sim | Sim | Sim | Sim | Sim | Sim | - | - |
| admin.controle_ponto | Sim | Sim | Sim | Sim | Nao | Sim | - | Sim | - |
| admin.escala_mes | Sim | Sim | Sim | Sim | Nao | Sim | - | Sim | - |
| admin.validacao_ponto | Sim | Sim | - | Sim | - | Sim | - | Sim | - |
| admin.quadro_avisos | Sim | Sim | Sim | Sim | Sim | Sim | - | - | - |
| logistica.* | Sim | Sim | - | - | - | Sim | - | - | - |
| producao.* | Sim | Sim | - | - | - | Sim | - | - | - |

### Perfil: Somente Leitura (nivel 20)
| Modulo | list | read | create | update | delete | export | toggle | validate | force |
|--------|------|------|--------|--------|--------|--------|--------|----------|-------|
| admin.dashboard | Sim | Sim | - | - | - | Nao | - | - | - |
| admin.colaboradores | Sim | Sim | - | - | - | Nao | - | - | - |
| admin.filiais | Sim | Sim | - | - | - | Nao | - | - | - |
| admin.feriados | Sim | Sim | - | - | - | Nao | - | - | - |
| admin.controle_ponto | Sim | Sim | - | - | - | Nao | - | - | - |
| logistica.dashboard | Sim | Sim | - | - | - | Nao | - | - | - |
| producao.dashboard | Sim | Sim | - | - | - | Nao | - | - | - |

### Perfil: Ocultar Tudo (nivel 0)
| Modulo | list | read | create | update | delete | export | toggle | validate | force |
|--------|------|------|--------|--------|--------|--------|--------|----------|-------|
| * | Nao | Nao | Nao | Nao | Nao | Nao | Nao | Nao | Nao |

---

## Regras RLS (Row Level Security)

### Sessao do Usuario
```sql
-- O contexto de seguranca contem:
-- auth.uid() -> UUID do usuario
-- perfil_id -> UUID do perfil
-- nivel_hierarquico -> INTEGER
-- filial_id -> UUID da filial
```

### Regras por Entidade

#### Colaboradores
```sql
-- Administradores veem todos
CREATE POLICY "admin_see_all" ON colaboradores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM perfis WHERE id = current_perfil_id AND nivel_hierarquico >= 100
    )
  );

-- Gestores veem da mesma filial ou filiais subordinadas
CREATE POLICY "gestor_see_same_filial" ON colaboradores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM perfis WHERE id = current_perfil_id AND nivel_hierarquico >= 80
    )
    AND (
      filial_id = current_filial_id
      OR responsavel_filial_id = current_filial_id
    )
  );

-- Colaboradores veem apenas a si mesmos
CREATE POLICY "colab_see_self" ON colaboradores
  FOR ALL USING (
    id = current_user_id
  );
```

#### Sessoes (Usuarios Online)
```sql
-- Administradores e Gestores veem todas
CREATE POLICY "admin_see_all_sessions" ON sessoes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM perfis WHERE id = current_perfil_id AND nivel_hierarquico >= 80
    )
  );

-- Colaboradores veem apenas suas propias sessoes
CREATE POLICY "colab_see_self_session" ON sessoes
  FOR SELECT USING (
    usuario_id = current_user_id
  );
```

#### Batidas de Ponto
```sql
-- Todos veem batidas da propria filial
CREATE POLICY "see_filial_batidas" ON batidas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM colaboradores c
      WHERE c.id = batidas.colaborador_id
      AND c.filial_id = current_filial_id
    )
  );

-- Apenas lideres e acima podem validar
CREATE POLICY "validate_batidas" ON batidas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfis WHERE id = current_perfil_id AND nivel_hierarquico >= 60
    )
  );
```

---

## Heranca de Permissoes

Permissoes herdam do nivel hierarquico:

- Nivel 100: Acesso total
- Nivel 80+: Pode gerenciar subordinados
- Nivel 60+: Pode validar entradas
- Nivel 50+: Acesso basico
- Nivel 20: Apenas leitura
- Nivel 0: Nenhum acesso

---

## Atributos de Seguranca

### Elementos Protegidos
| Elemento | Protecao |
|----------|----------|
| Senha | bcrypt com salt unico, nunca exposta |
| Token JWT | Assinado com RS256, tempo de vida 1h |
| Refresh Token | Armazenado hash, tempo de vida 30d |
| IP do usuario | Logado, nunca exposto ao cliente |
| Session token | Hash SHA-256 |

### Auditoria
| Evento | Registrado |
|--------|------------|
| Login | Sim (usuario, IP, User-Agent) |
| Logout | Sim |
| Falha de login | Sim (tentativas) |
| Permissao negada | Sim (recurso, IP) |
| Modificacao de perfil | Sim (antes/depois) |
| Forcar logout | Sim (admin que forcou) |
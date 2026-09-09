# Checklist Operacional — Hostinger VPS

## Visão Geral

Este checklist consolida as boas práticas de segurança e operação pós-deploy do Pion-G-Hub na Hostinger VPS. De ser executado imediatamente após o primeiro deploy.

**Referência**: `docs/guia-deploy-hostinger.md`, `docs/infra-hostinger.md`

---

## 1. Variáveis de Ambiente

- [ ] Arquivo `.env` criado na raiz do projeto
- [ ] `JWT_SECRET` configurado com valor seguro (mínimo 32 caracteres aleatórios)
- [ ] `SUPABASE_URL` e `SUPABASE_ANON_KEY` preenchidos
- [ ] `DATABASE_URL` apontando para o Supabase correto
- [ ] `CORS_ORIGIN` restrito ao domínio de produção (não usar `*`)
- [ ] `NODE_ENV=production`
- [ ] Permissões do arquivo `.env` definidas como `chmod 600`
- [ ] Arquivo `.env` está no `.gitignore`

### Geração de JWT_SECRET Seguro

```bash
openssl rand -hex 32
# Saída: a1b2c3d4e5f6... (64 caracteres hexadecimais)
```

---

## 2. Containers Docker

- [ ] `docker compose up -d --build` executado com sucesso
- [ ] Ambos os containers estão `running (healthy)`:
  - `piong-hub-backend` — porta 3000
  - `piong-hub-frontend` — porta 80
- [ ] Health checks respondendo:
  ```bash
  curl http://localhost/health       # HTTP 200
  curl http://localhost:3000/health  # HTTP 200
  ```
- [ ] Logs sem erros críticos:
  ```bash
  docker compose logs -f
  ```

---

## 3. Firewall e Rede

- [ ] UFW ativado (`ufw status`)
- [ ] Portas abertas: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- [ ] Porta 3000 (backend) **não** exposta publicamente (acessível apenas via proxy reverso)
- [ ] Nginx configurado como proxy reverso (se aplicável)

### Configuração UFW Esperada

```bash
ufw status
# Saída esperada:
# 22/tcp    ALLOW    Anywhere
# 80/tcp    ALLOW    Anywhere
# 443/tcp   ALLOW    Anywhere
```

---

## 4. SSL/HTTPS

- [ ] Certificado Let's Encrypt instalado (se usar domínio próprio)
- [ ] HTTP redireciona para HTTPS (301)
- [ ] Renovação automática configurada:
  ```bash
  certbot renew --dry-run  # Testar renovação
  systemctl list-timers | grep certbot  # Verificar timer
  ```
- [ ] Cadeia de certificados completa (fullchain.pem)

---

## 5. Segurança de Containers

- [ ] Backend roda como usuário não-root (`express`, UID 1001)
- [ ] Frontend roda como usuário não-root (`nginx` padrão)
- [ ] `server_tokens off` configurado no Nginx
- [ ] Helmet ativo (security headers no backend)
- [ ] CORS restrito ao domínio de produção

### Verificar Usuário dos Containers

```bash
docker compose exec backend id
# Esperado: uid=1001(express) gid=1001(nodejs)
```

---

## 6. Banco de Dados

- [ ] Migrations aplicadas (`npm run migrate`)
- [ ] Row Level Security (RLS) ativado nas tabelas sensíveis
- [ ] Usuário do banco com permissões mínimas (não superuser)
- [ ] Backup automático configurado no Supabase
- [ ] Conexão via SSL (Supabase padrão)

### Teste de Conexão

```bash
docker compose exec backend node -e "
const { getDatabase } = require('./dist/shared/database');
const db = getDatabase();
db.query('SELECT NOW()').then(r => console.log('DB OK:', r.rows[0]));
"
```

---

## 7. Monitoramento

- [ ] Logs sendo coletados (`docker compose logs`)
- [ ] Health checks configurados (backend + frontend)
- [ ] Alerta para `docker compose ps` mostrando containers `unhealthy`
- [ ] Monitoramento de disco (`df -h`) — alerta se > 80%
- [ ] Monitoramento de RAM (`free -h`) — alerta se < 512MB livre

### Comandos de Monitoramento

```bash
# Status dos containers
docker compose ps

# Uso de recursos
docker stats --no-stream

# Espaço em disco
df -h

# Memória
free -h
```

---

## 8. Backups

- [ ] Backup do código fonte (git remote configurado)
- [ ] Backup do arquivo `.env` (armazenado separadamente, não no repo)
- [ ] Exportação automática do Supabase (painel → Settings → Backups)
- [ ] Teste de restauração de backup executado pelo menos uma vez

### Backup do Código

```bash
tar -czf piong-hub-code-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=frontend/dist \
  --exclude=.git \
  /opt/apps/piong-hub
```

### Exportação Supabase

```bash
# Via painel Supabase: Settings → Database → Backups → Export
# Exportar em formato CSV ou SQL conforme necessidade
```

---

## 9. Performance

- [ ] Gzip ativado no Nginx (verificar response headers `Content-Encoding: gzip`)
- [ ] Cache de assets estáticos configurado (`Cache-Control: public, immutable`)
- [ ] Índices do banco aplicados (migration 009)
- [ ] Rate limiting ativo (verificar headers `X-RateLimit-*` em respostas)
- [ ] Build de produção executado (`npm run build`)

### Verificar Gzip

```bash
curl -I http://localhost/assets/index.js
# Esperado: Content-Encoding: gzip
```

---

## 10. Atualizações e Manutenção

- [ ] Processo de atualização documentado (`docs/guia-deploy-hostinger.md`)
- [ ] Janela de manutenção definida (se necessário)
- [ ] Rollback planejado (tag/commit anterior disponível)
- [ ] Notificação de indisponibilidade configurada (se aplicável)

### Procedimento de Atualização

```bash
cd /opt/apps/piong-hub
git pull origin master
docker compose up -d --build
docker compose logs -f  # Monitorar
```

---

## 11. Logs e Auditoria

- [ ] Logs de acesso do Nginx preservados
- [ ] Logs da API (`docker compose logs backend`) com retenção adequada
- [ ] Logs de auditoria do banco ativos (Supabase)
- [ ] Rotação de logs configurada (evitar disco cheio)

### Configurar Rotação de Logs Docker

```bash
# /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

---

## 12. Segurança Adicional

- [ ] SSH com chave pública (senha desabilitada se possível)
- [ ] Fail2Ban instalado (proteção contra brute force SSH)
- [ ] Atualizações automáticas de segurança configuradas:
  ```bash
  apt install unattended-upgrades -y
  dpkg-reconfigure -plow unattended-upgrades
  ```
- [ ] Snapshot da VPS criado antes do deploy

### Fail2Ban

```bash
apt install fail2ban -y
# Configuração padrão protege SSH
# Customizar para proteger porta 80/443 se necessário
```

---

## 13. Domínio e DNS

- [ ] Domínio apontando para o IP da VPS (registro A)
- [ ] Propagação DNS verificada (`dig seudominio.com.br`)
- [ ] `www` configurado como alias (CNAME ou A record)
- [ ] SSL válido para domínio principal e `www`

### Verificar DNS

```bash
dig seudominio.com.br +short
# Esperado: IP da VPS

dig www.seudominio.com.br +short
# Esperado: IP da VPS
```

---

## 14. Validação Final

Execute estes comandos para validar o deploy completo:

```bash
# 1. Verificar containers
docker compose ps

# 2. Testar health checks
curl -s http://localhost/health       # Frontend
curl -s http://localhost:3000/health  # Backend

# 3. Testar API
curl -s http://localhost/api/v1/auth/me \
  -H "Authorization: Bearer SEU_TOKEN" \
  | jq .

# 4. Testar frontend (via Nginx)
curl -s http://localhost/ | head -5

# 5. Verificar SSL (se configurado)
curl -I https://seudominio.com.br
```

---

## 15. Contatos e Escalação

| Problema | Ação |
|----------|------|
| Container não inicia | `docker compose logs <serviço>` |
| API retorna 500 | Verificar logs do backend + variáveis `.env` |
| Frontend retorna 404 em rotas | Verificar `nginx.conf` (`try_files`) |
| SSL expira | `certbot renew` |
| Banco desconectado | Verificar `SUPABASE_URL` no `.env` |
| Disco cheio | `docker system prune` + verificar logs |

---

## Referências

- [Guia de Deploy](docs/guia-deploy-hostinger.md)
- [Infraestrutura Docker](docs/infra-hostinger.md)
- [Homologação](docs/homologacao-sistema.md)
- [Catálogo de API](docs/catalogo-api.md)

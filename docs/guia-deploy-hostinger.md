# Guia de Deploy — Hostinger VPS

## Visão Geral

Este guia passo a passo cobre o deploy completo do Pion-G-Hub em uma VPS da Hostinger usando Docker e Docker Compose.

**Requisitos Mínimos**: VPS com 1GB RAM, Ubuntu 22.04+, Docker 24+, Docker Compose v2+.

---

## 1. Preparação da VPS

### 1.1 Conexão SSH

```bash
ssh root@SEU_IP_VPS
```

### 1.2 Atualização do Sistema

```bash
apt update && apt upgrade -y
apt install -y curl wget git ufw
```

### 1.3 Instalação do Docker

```bash
# Instalar Docker oficial
curl -fsSL https://get.docker.com | sh

# Instalar Docker Compose plugin
apt install docker-compose-plugin -y

# Verificar instalação
docker --version          # Docker version 24+
docker compose version    # Docker Compose version v2+
```

### 1.4 Configurar Firewall

```bash
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw enable
ufw status
```

---

## 2. Clone do Repositório

```bash
# Criar diretório de aplicações
mkdir -p /opt/apps && cd /opt/apps

# Clonar repositório
git clone https://github.com/seu-usuario/piong-hub.git
cd piong-hub
```

### 2.1 Criar Arquivo `.env`

```bash
# Copiar template (se existir) ou criar do zero
nano .env
```

Conteúdo mínimo:

```env
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key-aqui

# Autenticação (gerar com: openssl rand -hex 32)
JWT_SECRET=secret-min-32-caracteres-aleatorio-aqui

# CORS
CORS_ORIGIN=https://seudominio.com.br

# Webhooks
WEBHOOK_TIMEOUT_MS=5000
LOG_LEVEL=info
```

> **Segurança**: Nunca comite o arquivo `.env`. Mantenha permissões restritas:
> ```bash
> chmod 600 .env
> ```

---

## 3. Deploy dos Containers

### 3.1 Build e Inicialização

```bash
# Subir serviços em background
docker compose up -d --build

# Verificar status
docker compose ps

# Esperado:
# NAME                    SERVICE       STATUS
# piong-hub-backend       backend       running (healthy)
# piong-hub-frontend      frontend      running (healthy)
```

### 3.2 Verificação de Saúde

```bash
# Frontend (porta 80)
curl http://localhost/health
# Esperado: HTTP 200

# Backend (porta 3000)
curl http://localhost:3000/health
# Esperado: {"status":"ok","timestamp":"..."}
```

### 3.3 Logs

```bash
# Logs de ambos os serviços
docker compose logs -f

# Logs de um serviço específico
docker compose logs -f backend
docker compose logs -f frontend
```

---

## 4. Proxy Reverso e SSL

### 4.1 Configurar Nginx como Proxy Reverso

Se a Hostinger gerencia o Nginx na porta 80/443:

```bash
# Criar configuração do site
nano /etc/nginx/sites-available/piong-hub
```

```nginx
server {
    listen 80;
    server_name seudominio.com.br www.seudominio.com.br;

    # Redirecionar HTTP → HTTPS (após configurar SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Ativar site
ln -s /etc/nginx/sites-available/piong-hub /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

# Recarregar Nginx
systemctl reload nginx
```

### 4.2 SSL com Let's Encrypt

```bash
# Instalar Certbot
apt install certbot python3-certbot-nginx -y

# Gerar certificado (para domínio já configurado no DNS)
certbot --nginx -d seudominio.com.br -d www.seudominio.com.br

# Após certificação, atualizar Nginx para HTTPS
```

Após o Certbot, a configuração Nginx terá:

```nginx
server {
    listen 443 ssl;
    server_name seudominio.com.br;

    ssl_certificate /etc/letsencrypt/live/seudominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com.br/privkey.pem;

    # Redirect HTTP → HTTPS
    location / {
        proxy_pass http://localhost:80;
        ...
    }

    location /api/ {
        proxy_pass http://localhost:3000/;
        ...
    }
}

server {
    listen 80;
    server_name seudominio.com.br;
    return 301 https://$server_name$request_uri;
}
```

### 4.3 Renovação Automática de SSL

```bash
# Testar renovação
certbot renew --dry-run

# O Certbot configura um timer automático. Verificar:
systemctl list-timers | grep certbot
```

---

## 5. Manutenção

### 5.1 Atualização do Código

```bash
cd /opt/apps/piong-hub

# Pull do código
git pull origin master

# Rebuild e restart dos containers
docker compose up -d --build

# Verificar logs
docker compose logs -f
```

### 5.2 Backup

```bash
# Backup do código e variáveis
tar -czf piong-hub-backup-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=frontend/dist \
  /opt/apps/piong-hub

# Backup do banco (Supabase)
# Utilize o painel do Supabase para exportar dados
```

### 5.3 Monitoramento

```bash
# Uso de recursos
docker stats

# Status dos containers
docker compose ps

# Logs recentes
docker compose logs --tail=100
```

### 5.4 Comandos Úteis

```bash
# Parar containers
docker compose down

# Parar e remover volumes (CUIDADO: perde dados)
docker compose down -v

# Reiniciar um serviço específico
docker compose restart backend

# Executar comando dentro do container
docker compose exec backend node -e "console.log('test')"
docker compose exec frontend cat /usr/share/nginx/html/index.html

# Limpar imagens não utilizadas
docker image prune -a
```

---

## 6. Troubleshooting

### 6.1 Container não inicia

```bash
# Verificar logs
docker compose logs backend

# Erro comum: variável de ambiente faltando
# Solução: verificar arquivo .env
```

### 6.2 Frontend retorna 404 em rotas do React Router

- Verificar se o `nginx.conf` do frontend contém `try_files $uri /index.html`.
- Rebuild do frontend: `docker compose build frontend`.

### 6.3 Backend retorna CORS error

- Verificar se `CORS_ORIGIN` no `.env` corresponde ao domínio do frontend.
- Rebuild do backend: `docker compose build backend`.

### 6.4 Porta já em uso

```bash
# Identificar processo na porta
lsof -i :80
lsof -i :3000

# Parar processo ou alterar porta no docker-compose.yml
```

---

## 7. Segurança Pós-Deploy

| Item | Ação |
|------|------|
| Firewall | `ufw` configurado (apenas 22, 80, 443) |
| SSL | Let's Encrypt com renovação automática |
| Variáveis | `.env` com `chmod 600` |
| Containers | Rodam como usuário não-root |
| Updates | `apt update && apt upgrade` periódico |
| Backups | Exportar Supabase + snapshot do código |
| Logs | Monitorar via `docker compose logs` |

Consulte `docs/checklist-hostinger.md` para a checklist completa de segurança.

---

## 8. Referências

- Docker Compose: https://docs.docker.com/compose/
- Nginx como proxy reverso: https://www.nginx.com/resources/wiki/start/topics/tutorials/config_pitfalls/
- Let's Encrypt: https://certbot.eff.org/
- Hostinger VPS docs: https://www.hostinger.com/tutorials/how-to-use-docker-on-vps

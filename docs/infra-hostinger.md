# Infraestrutura — Deploy na Hostinger (VPS Docker)

## Visão Geral

Este documento descreve a configuração de infraestrutura do Pion-G-Hub para deploy em VPS da Hostinger via Docker.

**Referência**: Dockerfile em `./Dockerfile` (backend), `.dockerignore`.

---

## 1. Pré-Requisitos na VPS

| Item | Requisito |
|------|-----------|
| Sistema Operacional | Ubuntu 22.04+ (recomendado) ou Debian 12+ |
| Docker | v24+ (`docker --version`) |
| Docker Compose | v2+ (`docker compose version`) |
| Portas | 3000 (backend), 80/443 (frontend Nginx) |
| Banco de Dados | PostgreSQL via Supabase (não local) |
| Memória RAM | Mínimo 1GB, recomendado 2GB+ |

### 1.1 Instalação do Docker na Hostinger

```bash
# Atualizar pacotes
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Instalar Docker Compose plugin
apt install docker-compose-plugin -y

# Verificar instalação
docker --version       # esperado: Docker version 24+
docker compose version # esperado: Docker Compose version v2+
```

### 1.2 Configurar Firewall

```bash
# Permitir portas necessárias
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

---

## 2. Estrutura de Deploy

```
piong-hub/
├── Dockerfile                  # Backend (Node.js multi-stage)
├── docker-compose.yml          # Orquestração local/staging
├── .env                        # Variáveis de ambiente (NÃO versionar)
├── .dockerignore               # Exclusões do contexto Docker
├── src/                        # Código fonte backend
├── frontend/
│   ├── Dockerfile              # Frontend (Vite + Nginx)
│   └── dist/                   # Build do frontend (gerado)
└── docs/
    └── infra-hostinger.md      # Este documento
```

---

## 3. Backend — Dockerfile

### 3.1 Multi-Stage Build

O Dockerfile do backend utiliza **2 estágios**:

| Stage | Base Image | Finalidade |
|-------|------------|------------|
| `builder` | `node:20-alpine` | Compilar TypeScript → JavaScript |
| `runner` | `node:20-alpine` | Executar a aplicação (imagem limpa) |

### 3.2 Características de Segurança

- **Usuário não-root**: A aplicação roda como `express` (UID 1001), não como `root`.
- **Imagem enxuta**: Apenas `dist/`, `node_modules/` e `package.json` são copiados para o runner.
- **Health check**: Endpoint `/health` verificado a cada 30s.

### 3.3 Comandos Principais

```bash
# Build da imagem
docker build -t piong-hub-backend:latest .

# Executar container
docker run -p 3000:3000 --env-file .env piong-hub-backend:latest

# Verificar health
curl http://localhost:3000/health
```

---

## 4. Variáveis de Ambiente

### 4.1 Backend (`.env`)

```env
# Servidor
NODE_ENV=production
PORT=3000

# Banco de Dados (Supabase)
DATABASE_URL=postgres://user:pass@host:5432/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...

# Autenticação
JWT_SECRET=<secret-aleatorio-min-32-caracteres>

# CORS
CORS_ORIGIN=https://seudominio.com.br

# Webhooks
WEBHOOK_TIMEOUT_MS=5000

# Logs
LOG_LEVEL=info
```

### 4.2 Segurança das Variáveis

- O arquivo `.env` **nunca** deve ser commitado (ver `.gitignore`).
- Na Hostinger, utilize `docker compose --env-file .env up -d`.
- Para produção, considere Docker Secrets ou variáveis injetadas pelo painel da Hostinger.

---

## 5. Frontend — Dockerfile + Nginx

### 5.1 Multi-Stage Build

O Dockerfile do frontend utiliza **2 estágios**:

| Stage | Base Image | Finalidade |
|-------|------------|------------|
| `builder` | `node:20-alpine` | Compilar React/Vite (tsc + vite build) |
| `runner` | `nginx:1.27-alpine` | Servir assets estáticos com Nginx |

### 5.2 Configuração Nginx (`nginx.conf`)

| Diretiva | Valor | Finalidade |
|----------|-------|------------|
| `gzip on` | Tipos: JS, CSS, JSON, SVG, fonts | Reduz tamanho de transferência |
| Cache assets com hash | `expires 1y` + `immutable` | Cache agressivo para chunks versionados |
| SPA fallback | `try_files $uri /index.html` | React Router funciona em refresh |
| `server_tokens off` | — | Oculta versão do Nginx |

### 5.3 Health Check

```bash
# Container retorna HTTP 200 para /health
curl http://localhost/health
```

### 5.4 Comandos Principais

```bash
# Build da imagem
docker build -t piong-hub-frontend:latest -f frontend/Dockerfile frontend/

# Executar container
docker run -p 80:80 piong-hub-frontend:latest

# Ou via Docker Compose (recomendado)
docker compose up frontend -d
```

---

## 6. Estrutura Completa de Arquivos

```
piong-hub/
├── Dockerfile                  # Backend (Node.js multi-stage)
├── .dockerignore               # Exclusões globais
├── docker-compose.yml          # Orquestração unificada
├── .env                        # Variáveis de ambiente
├── src/                        # Código fonte backend
├── frontend/
│   ├── Dockerfile              # Frontend (Vite + Nginx)
│   ├── nginx.conf              # Configuração do Nginx
│   └── dist/                   # Build do frontend (gerado)
└── docs/
    └── infra-hostinger.md      # Este documento
```

---

## 7. Orquestração com Docker Compose

### 7.1 Arquivo: `docker-compose.yml`

O arquivo unifica os dois serviços:

| Serviço | Imagem | Porta | Finalidade |
|---------|--------|-------|------------|
| `backend` | Build local (Dockerfile multi-stage) | 3000 | API Node.js + Express |
| `frontend` | Build local (Vite + Nginx Alpine) | 80 | React SPA servida por Nginx |

### 7.2 Network

Ambos os serviços compartilham a rede `piong-hub-network` (driver `bridge`), permitindo comunicação interna por nome de serviço (ex: `backend:3000`).

### 7.3 Variáveis de Ambiente

O backend carrega variáveis via `env_file: .env`. O frontend não requer variáveis adicionais pois o build do Vite já gera os assets estáticos.

### 7.4 Health Checks

| Serviço | Método | Intervalo | Finalidade |
|---------|--------|-----------|------------|
| `backend` | `GET /health` via Node.js | 30s | Garante API respondendo |
| `frontend` | `wget /health` | 30s | Garante Nginx respondendo |

O `frontend` depende de `backend` estar `healthy` antes de iniciar (`depends_on` com condição).

### 7.5 Comandos

```bash
# Subir ambos os serviços
docker compose up -d

# Ver status
docker compose ps

# Ver logs
docker compose logs -f

# Parar serviços
docker compose down

# Rebuild e restart
docker compose up -d --build
```

---

## 8. Deploy na Hostinger

### 8.1 Passo a Passo

```bash
# 1. Clonar repositório na VPS
git clone https://github.com/seu-usuario/piong-hub.git
cd piong-hub

# 2. Criar arquivo .env
cp .env.example .env
# Editar .env com valores de produção

# 3. Subir containers
docker compose up -d --build

# 4. Verificar health
curl http://localhost/health    # Frontend
curl http://localhost:3000/health # Backend

# 5. Ver logs
docker compose logs -f
```

### 8.2 Configurar Proxy Reverso (Nginx Hostinger)

Se a Hostinger já possui Nginx como proxy reverso na porta 80:

```nginx
server {
    listen 80;
    server_name seudominio.com.br;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 8.3 SSL com Let's Encrypt (opcional)

```bash
# Instalar Certbot
apt install certbot python3-certbot-nginx -y

# Gerar certificado
certbot --nginx -d seudominio.com.br

# Renovação automática (já configurada pelo Certbot)
```

---

## 9. Estrutura Completa de Arquivos

```
piong-hub/
├── Dockerfile                  # Backend (Node.js multi-stage)
├── .dockerignore               # Exclusões globais
├── docker-compose.yml          # Orquestração unificada
├── .env                        # Variáveis de ambiente (NÃO versionar)
├── src/                        # Código fonte backend
├── frontend/
│   ├── Dockerfile              # Frontend (Vite + Nginx)
│   ├── nginx.conf              # Configuração do Nginx
│   └── dist/                   # Build do frontend (gerado)
└── docs/
    └── infra-hostinger.md      # Este documento
```

---

## 10. Próximos Passos

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| `Dockerfile` | Backend multi-stage | Criado |
| `frontend/Dockerfile` | Frontend com Nginx | Criado |
| `frontend/nginx.conf` | Configuração Nginx | Criado |
| `docker-compose.yml` | Orquestração unificada | Criado |
| `docs/infra-hostinger.md` | Documentação de infraestrutura | Este documento |
| `docs/guia-deploy-hostinger.md` | Guia de deploy passo a passo | Pendente (Dia 10 / Hora 4) |

---

## 11. Referências

- Docker multi-stage builds: https://docs.docker.com/build/building/multi-stage/
- Docker Compose documentation: https://docs.docker.com/compose/
- Nginx SPA configuration: https://www.nginx.com/resources/wiki/start/topics/tutorials/config_pitfalls/
- Hostinger VPS Docker docs: https://www.hostinger.com/tutorials/how-to-use-docker-on-vps

---

## 8. Referências

- Docker multi-stage builds: https://docs.docker.com/build/building/multi-stage/
- Docker Compose documentation: https://docs.docker.com/compose/
- Nginx SPA configuration: https://www.nginx.com/resources/wiki/start/topics/tutorials/config_pitfalls/
- Hostinger VPS Docker docs: https://www.hostinger.com/tutorials/how-to-use-docker-on-vps

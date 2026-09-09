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

## 5. Próximos Passos

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| `Dockerfile` | Backend multi-stage | Criado |
| `docs/infra-hostinger.md` | Documentação de infraestrutura | Este documento |
| `frontend/Dockerfile` | Frontend com Nginx | Pendente (Dia 10 / Hora 2) |
| `docker-compose.yml` | Orquestração unificada | Pendente (Dia 10 / Hora 3) |

---

## 6. Referências

- Docker multi-stage builds: https://docs.docker.com/build/building/multi-stage/
- Docker security best practices: https://docs.docker.com/engine/security/
- Hostinger VPS Docker docs: https://www.hostinger.com/tutorials/how-to-use-docker-on-vps

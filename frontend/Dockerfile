# Frontend Dockerfile — Pion-G-Hub
# Multi-stage: Vite build → Nginx Alpine
# Alvo: Hostinger VPS

# ============================================================
# Stage 1: Builder (compila React/Vite)
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copia dependências primeiro para cache
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copia código fonte e compila
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY src/ ./src/
COPY index.html ./

# Build do Vite (gera dist/)
RUN npm run build

# ============================================================
# Stage 2: Runner (Nginx Alpine)
# ============================================================
FROM nginx:1.27-alpine AS runner

# Remove configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia configuração customizada
COPY nginx.conf /etc/nginx/conf.d/piong-hub.conf

# Copia artefatos de build do stage anterior
COPY --from=builder /app/dist/ /usr/share/nginx/html/

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Expõe porta 80
EXPOSE 80

# Inicializa Nginx em foreground
CMD ["nginx", "-g", "daemon off;"]

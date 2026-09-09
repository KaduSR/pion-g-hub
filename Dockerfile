# Backend Dockerfile — Pion-G-Hub
# Multi-stage: build (TypeScript) + runner (Node.js slim)
# Alvo: Hostinger VPS

# ============================================================
# Stage 1: Builder
# ============================================================
FROM node:20-alpine AS builder

# Diretório de trabalho
WORKDIR /app

# Copia arquivos de dependência primeiro (cache otimizado)
COPY package.json package-lock.json ./

# Instala TODAS as dependências (inclui devDependencies para build)
RUN npm ci --include=dev

# Copia o código fonte
COPY tsconfig.json ./
COPY src/ ./src/

# Compila TypeScript → JavaScript (gera dist/)
RUN npm run build

# ============================================================
# Stage 2: Runner
# ============================================================
FROM node:20-alpine AS runner

# curl é usado pelo healthcheck do Docker
RUN apk add --no-cache curl

# Diretório de trabalho
WORKDIR /app

# Cria usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 express

# Copia apenas o necessário do builder
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/package.json ./package.json

# Ajusta permissões
RUN chown -R express:nodejs /app

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Expõe a porta
EXPOSE 3000

# Usuário não-root
USER express

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Comando de inicialização
CMD ["node", "dist/app.js"]

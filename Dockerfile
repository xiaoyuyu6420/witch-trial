FROM --platform=linux/amd64 node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM --platform=linux/amd64 node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install sqlite first (before any cache issues)
RUN apk update && apk add --no-cache sqlite

# Copy standalone server
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/data ./src/data

# Copy all node_modules for Prisma CLI to work
COPY --from=builder /app/node_modules ./node_modules

# Entrypoint script: init DB then start server
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'mkdir -p /app/data' >> /app/entrypoint.sh && \
    echo 'npx prisma db push --accept-data-loss 2>/dev/null || true' >> /app/entrypoint.sh && \
    echo 'npx prisma db seed 2>/dev/null || true' >> /app/entrypoint.sh && \
    echo 'exec node server.js' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:./prisma/data/witch-trial.db"

EXPOSE 3001
CMD ["/app/entrypoint.sh"]

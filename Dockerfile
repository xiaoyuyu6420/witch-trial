FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated

# Init DB on first run
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
RUN apk add --no-cache sqlite

# Entrypoint script: init DB then start server
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'npx prisma db push --accept-data-loss 2>/dev/null' >> /app/entrypoint.sh && \
    echo 'npx prisma db seed 2>/dev/null || true' >> /app/entrypoint.sh && \
    echo 'exec node server.js' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

EXPOSE 3001
CMD ["/app/entrypoint.sh"]

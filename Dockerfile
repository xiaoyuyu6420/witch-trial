FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk update && apk add --no-cache sqlite dcron

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/scripts/backup.sh /app/scripts/backup.sh
RUN chmod +x /app/scripts/backup.sh

RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'set -e' >> /app/entrypoint.sh && \
    echo 'mkdir -p /app/data /backups' >> /app/entrypoint.sh && \
    echo 'if [ ! -f /app/data/witch-trial.db ]; then INIT_DB=1; fi' >> /app/entrypoint.sh && \
    echo 'npx prisma db push' >> /app/entrypoint.sh && \
    echo 'if [ "$INIT_DB" = "1" ]; then npx prisma db seed; fi' >> /app/entrypoint.sh && \
    echo '/app/scripts/backup.sh' >> /app/entrypoint.sh && \
    echo 'echo "0 */6 * * * /app/scripts/backup.sh" | crontab -' >> /app/entrypoint.sh && \
    echo 'crond' >> /app/entrypoint.sh && \
    echo 'exec node server.js' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/witch-trial.db"

EXPOSE 3001
CMD ["/app/entrypoint.sh"]
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/next-env.d.ts ./next-env.d.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

RUN addgroup -S workflowhub && adduser -S workflowhub -G workflowhub \
  && chown -R workflowhub:workflowhub /app

USER workflowhub
EXPOSE 3001

CMD ["sh", "./bin/docker-start.sh"]

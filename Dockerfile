FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Prisma client must exist in runtime for repositories.
RUN npx prisma generate

RUN npm run build

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/openapi ./openapi
COPY --from=build /app/templates ./templates
COPY --from=build /app/dist ./dist

EXPOSE 3000

# Apply DB migrations before starting the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

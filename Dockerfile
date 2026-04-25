FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Prisma config may read DATABASE_URL; build has no DB — dummy is only for client generation.
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/prisma_build_placeholder?schema=public
ENV DATABASE_URL=${DATABASE_URL}
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist

EXPOSE 4000

USER node

CMD ["npm", "run", "start:prod"]

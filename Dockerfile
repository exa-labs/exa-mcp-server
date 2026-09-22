FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY api ./api
COPY src ./src
COPY tsconfig.json ./
RUN npm run build:runtime

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8000

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY skills ./skills

RUN groupadd --system --gid 10001 exa \
  && useradd --system --uid 10001 --gid 10001 --home-dir /app exa
USER 10001:10001

EXPOSE 8000
CMD ["node", "dist/src/runtime-server.js"]

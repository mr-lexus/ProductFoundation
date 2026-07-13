# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /workspace
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm build:contracts && pnpm build:api
RUN pnpm --filter @app/api --prod deploy --legacy /prod/api

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /prod/api ./

USER node
EXPOSE 3001

CMD ["node", "--enable-source-maps", "dist/server.js"]

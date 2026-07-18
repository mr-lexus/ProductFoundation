# syntax=docker/dockerfile:1.7
FROM node:26-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66 AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /workspace
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm build:contracts && pnpm build:api
RUN pnpm --filter @app/api --prod deploy /prod/api

FROM node:26-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66 AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /prod/api ./

USER node
EXPOSE 3001 9464

CMD ["node", "--enable-source-maps", "dist/server.js"]

# syntax=docker/dockerfile:1.7
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /workspace
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm build:contracts && pnpm build:api
RUN pnpm --filter @app/api --prod deploy /prod/api

FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /prod/api ./

USER node
EXPOSE 3001 9464

CMD ["node", "--enable-source-maps", "dist/server.js"]

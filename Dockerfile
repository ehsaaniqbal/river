# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS app

ENV PNPM_HOME=/pnpm
ENV PATH=/pnpm:/root/.bun/bin:$PATH
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl unzip \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.14" \
  && ln -s /root/.bun/bin/bun /usr/local/bin/bun

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages ./packages

RUN pnpm install --frozen-lockfile

ARG NEXT_PUBLIC_RIVER_SERVER_URL=http://localhost:8787
ENV NEXT_PUBLIC_RIVER_SERVER_URL=$NEXT_PUBLIC_RIVER_SERVER_URL

RUN pnpm build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=8787
ENV RIVER_SERVER_PORT=8787
ENV RIVER_SQLITE_PATH=/data/river.sqlite

EXPOSE 3000 8787
VOLUME ["/data"]

CMD ["bash", "-lc", "mkdir -p /data; cd /app/packages/server; bun src/server.ts & server_pid=$!; cd /app/packages/web; pnpm start --hostname 0.0.0.0 --port 3000 & web_pid=$!; trap 'kill $server_pid $web_pid 2>/dev/null' TERM INT; wait -n $server_pid $web_pid"]

# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS app

ENV PNPM_HOME=/pnpm
ENV PATH=/pnpm:/root/.bun/bin:$PATH
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl gettext-base nginx-light unzip \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.14" \
  && ln -s /root/.bun/bin/bun /usr/local/bin/bun

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages ./packages

RUN pnpm install --frozen-lockfile

ARG NEXT_PUBLIC_RIVER_SERVER_URL=
ENV NEXT_PUBLIC_RIVER_SERVER_URL=$NEXT_PUBLIC_RIVER_SERVER_URL

RUN pnpm build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV RIVER_SERVER_PORT=8787
ENV RIVER_SQLITE_PATH=/data/river.sqlite

COPY nginx.conf.template /etc/nginx/templates/river.conf.template

EXPOSE 3000
VOLUME ["/data"]

CMD ["bash", "-lc", "mkdir -p /data; export NGINX_PORT=${PORT:-3000}; envsubst '$$NGINX_PORT' < /etc/nginx/templates/river.conf.template > /etc/nginx/conf.d/default.conf; cd /app/packages/server; RIVER_SERVER_PORT=${RIVER_SERVER_PORT:-8787} bun src/server.ts & server_pid=$!; cd /app/packages/web; pnpm start --hostname 127.0.0.1 --port 3001 & web_pid=$!; nginx -g 'daemon off;' & nginx_pid=$!; trap 'kill $server_pid $web_pid $nginx_pid 2>/dev/null' TERM INT; wait -n $server_pid $web_pid $nginx_pid"]

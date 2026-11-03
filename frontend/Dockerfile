FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM builder AS asset-files
RUN find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.map' \) -delete

FROM pgsty/silo:RELEASE.2026-10-26T00-00-00Z AS assets
COPY --from=asset-files /app/dist /assets
COPY scripts/publish-assets.sh /publish-assets.sh
COPY scripts/public-assets-policy.json /public-assets-policy.json
ENTRYPOINT ["/bin/sh", "/publish-assets.sh"]

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# ─── Build ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npm run build && test -f dist/server.js && test -f dist/seed.js

# ─── Runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# FFmpeg for RTMP output, yt-dlp for the YouTube fallback.
# The build fails loudly if yt-dlp cannot be installed (it used to be skipped silently).
# YouTube changes often: rebuild the image (Portainer "Re-pull image and redeploy" with no cache) to get a fresh yt-dlp.
RUN apk add --no-cache ffmpeg python3 py3-pip ca-certificates tini openssl \
 && python3 -m pip install --no-cache-dir --break-system-packages yt-dlp \
 && yt-dlp --version

ENV NODE_ENV=production \
    UPLOADS_DIR=/app/uploads

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
 && mkdir -p /app/uploads \
 && chown -R node:node /app/uploads

USER node
EXPOSE 4000

ENTRYPOINT ["/sbin/tini", "--", "docker-entrypoint.sh"]

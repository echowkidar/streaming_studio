FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Install FFmpeg, Python3, py3-pip, and yt-dlp for Live RTMP Streaming & Direct YouTube MP4 Stage Recording
RUN apk add --no-cache ffmpeg python3 py3-pip curl ca-certificates && \
    (python3 -m pip install --no-cache-dir --break-system-packages -U yt-dlp || \
     curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp) || true


ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

ARG ENTRY_POINT=dist/server.js
ENV ENTRY_POINT=${ENTRY_POINT}

EXPOSE 4000 4001

CMD ["sh", "-c", "if [ \"$ENTRY_POINT\" = \"ws\" ]; then if [ -f \"dist/ws-server.js\" ]; then node dist/ws-server.js; else node dist/src/ws-server.js; fi; elif [ \"$ENTRY_POINT\" = \"worker\" ]; then if [ -f \"dist/worker-server.js\" ]; then node dist/worker-server.js; else node dist/src/worker-server.js; fi; else npx prisma db push --skip-generate --accept-data-loss || true; if [ -f \"dist/seed.js\" ]; then node dist/seed.js || true; fi; if [ -f \"dist/server.js\" ]; then node dist/server.js; elif [ -f \"dist/src/server.js\" ]; then node dist/src/server.js; else node ${ENTRY_POINT}; fi; fi"]

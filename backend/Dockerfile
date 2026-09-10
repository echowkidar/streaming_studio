FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

ARG ENTRY_POINT=dist/server.js
ENV ENTRY_POINT=${ENTRY_POINT}

EXPOSE 4000 4001

CMD ["sh", "-c", "if [ \"$ENTRY_POINT\" = \"ws\" ]; then if [ -f \"dist/ws-server.js\" ]; then node dist/ws-server.js; else node dist/src/ws-server.js; fi; elif [ \"$ENTRY_POINT\" = \"worker\" ]; then if [ -f \"dist/worker-server.js\" ]; then node dist/worker-server.js; else node dist/src/worker-server.js; fi; elif [ -f \"dist/server.js\" ]; then node dist/server.js; elif [ -f \"dist/src/server.js\" ]; then node dist/src/server.js; else node ${ENTRY_POINT}; fi"]



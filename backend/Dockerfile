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

CMD ["sh", "-c", "if [ \"$ENTRY_POINT\" = \"ws\" ]; then node dist/ws-server.js; elif [ \"$ENTRY_POINT\" = \"worker\" ]; then node dist/worker-server.js; else node ${ENTRY_POINT}; fi"]

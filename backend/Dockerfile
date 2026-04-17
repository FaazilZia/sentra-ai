# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies for Prisma and building
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

# Generate Prisma Client and Build
RUN npx prisma generate
RUN npm run build

# Stage 2: Runtime
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 10000

ENV NODE_ENV=production

CMD ["npm", "start"]

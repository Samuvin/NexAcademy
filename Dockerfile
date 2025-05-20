# 1. Build stage
FROM node:20 AS builder


# Accept build args
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --frozen-lockfile

# Install Chrome for Puppeteer
RUN npx puppeteer browsers install chrome

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# 2. Production image
FROM node:20 AS runner

WORKDIR /app

# Install Chrome dependencies for Puppeteer
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /root/.cache/puppeteer /root/.cache/puppeteer

# Expose the port
EXPOSE 3000

# Start the app
CMD ["npm", "start"] 
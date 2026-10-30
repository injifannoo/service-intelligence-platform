FROM node:22-alpine

WORKDIR /app

# Build context is the repository root (see docker-compose.yml).
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm config set maxsockets 2 \
    && npm install --legacy-peer-deps --prefer-offline

COPY frontend/ .

EXPOSE 3000

CMD ["npm", "run", "dev"]

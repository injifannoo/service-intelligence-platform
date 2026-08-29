FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
# Limit npm concurrency to max 2 sockets to prevent RAM/WSL crash
RUN npm config set maxsockets 2 && \
    npm install --legacy-peer-deps --prefer-offline

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
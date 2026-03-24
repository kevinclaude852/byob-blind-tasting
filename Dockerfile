FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Ensure data directories exist
RUN mkdir -p data/games data/reference

EXPOSE 3000

CMD ["node", "server.js"]

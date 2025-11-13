# Use Node.js LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies including TypeScript
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install -g typescript && \
    npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "dist/server/server.js"]
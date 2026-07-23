# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

# Production stage
FROM node:22-alpine
# Remove npm/corepack from the runtime image — not needed to run the app,
# and npm's bundled dependencies (tar, sigstore, etc.) carry known CVEs
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn*

# Create .kube directory for the node user
RUN mkdir -p /home/node/.kube && chown -R node:node /home/node/.kube

WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Set proper ownership of application files
RUN chown -R node:node /app

# Switch to non-root user
USER node

EXPOSE 3000
ENV NODE_ENV=production
# Set HOME explicitly to ensure .kube/config is found in the right place
ENV HOME=/home/node
CMD ["node", "build"]

FROM node:latest AS builder
# Switch to root to update OS libraries using apt-get
USER root
RUN apt-get update && apt-get install -y krb5-locales openssl && apt-get clean

# Switch back to node for app operations
USER node
WORKDIR /app
COPY --chown=node:node package*.json .
RUN npm ci
COPY --chown=node:node . .

RUN npm run build
RUN npm prune --production

FROM node:latest
# Update OS libraries in the runtime image
USER root
RUN apt-get update && apt-get upgrade -y && apt-get clean

USER node
WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json .
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "node", "build" ]
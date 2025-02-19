FROM registry1.dso.mil/ironbank/opensource/nodejs/nodejs-current:v22.10.0 AS builder
# Switch to root to update OS libraries using microdnf
USER root
RUN microdnf update -y krb5-libs openssl-libs && microdnf clean all

# Switch back to node for app operations
USER node
WORKDIR /app
COPY --chown=node:node package*.json .
RUN npm ci
COPY --chown=node:node . .

RUN npm run build
RUN npm prune --production

FROM registry1.dso.mil/ironbank/opensource/nodejs/nodejs-current:v22.10.0 
# Update OS libraries in the runtime image
USER root
RUN microdnf update -y krb5-libs openssl-libs && microdnf clean all

USER node
WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json .
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "node", "build" ]
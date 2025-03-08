# Docker and Kubernetes Access Implementation Plan

## Problem Statement

When running the Trivy Glass application in Docker, it fails to connect to the Kubernetes API with the error:

```
[ERROR] [KubeUtil] Critical error fetching rbacassessmentreports: Protocol "http:" not supported. Expected "https:"
```

This occurs because:

1. The application can't access the local kubeconfig file from within the Docker container
2. The Kubernetes client library expects to connect via HTTPS
3. The application works with `npm run dev` but fails in Docker
4. Running as root in Docker is a security concern

## Solution Overview

We'll implement a secure solution by:

1. Modifying the Dockerfile to run as a non-root user
2. Ensuring proper kubeconfig access for the non-root user
3. Providing instructions for running the container with the mounted kubeconfig
4. Updating the README.md with the new Docker run instructions

## Detailed Implementation Plan

### 1. Modify the Dockerfile

The current Dockerfile uses a two-stage build but doesn't explicitly set a non-root user. We'll modify it to:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

# Production stage
FROM node:18-alpine
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
```

Key changes:

- Create a `.kube` directory for the node user
- Set proper ownership of application files
- Switch to the non-root `node` user before running the application
- Set the HOME environment variable explicitly

### 2. Docker Run Command

After implementing these changes, users will run the container with:

```bash
docker run -v ~/.kube/config:/home/node/.kube/config -p 3000:3000 trivy-glass
```

This mounts the local kubeconfig file to the non-root user's home directory where the Kubernetes client library will look for it.

### 3. Update README.md

We'll update the Docker section in the README.md to include the new instructions:

````markdown
### Docker

```bash
# Build the Docker image
docker build -t trivy-glass .

# Run the container with Kubernetes access
docker run -v ~/.kube/config:/home/node/.kube/config -p 3000:3000 trivy-glass
```
````

> **Note:** The container runs as a non-root user for security. The `-v ~/.kube/config:/home/node/.kube/config` option mounts your local kubeconfig file into the container, allowing it to access your Kubernetes cluster.

````

### 4. Testing Strategy

To verify the solution:
1. Build the new Docker image with the updated Dockerfile
2. Run the container with the mounted kubeconfig
3. Access the application at http://localhost:3000
4. Verify that it can connect to the Kubernetes API and display reports

## Alternative Approaches

### Option 1: Environment Variable for Kubeconfig Path

If modifying the Dockerfile is not preferred, we could also set the KUBECONFIG environment variable:

```bash
docker run -v ~/.kube/config:/app/kubeconfig -e KUBECONFIG=/app/kubeconfig -p 3000:3000 trivy-glass
````

### Option 2: Modify kubeUtil.ts

Another approach would be to modify the kubeUtil.ts file to look for the kubeconfig in a specific location:

```typescript
// In getKubeConfig function
if (activeClusterName === 'local') {
	// Check for custom kubeconfig path
	if (process.env.KUBECONFIG) {
		Logger.info(`Loading kubeconfig from ${process.env.KUBECONFIG}`);
		config.loadFromFile(process.env.KUBECONFIG);
	} else if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
		Logger.info('Loading kubeconfig from in-cluster environment');
		config.loadFromCluster();
	} else {
		Logger.info('Loading kubeconfig from default location');
		config.loadFromDefault();
	}
}
```

## Implementation Timeline

1. Modify the Dockerfile (30 minutes)
2. Test the changes locally (30 minutes)
3. Update the README.md (15 minutes)
4. Create a pull request with the changes (15 minutes)

Total estimated time: 1.5 hours

## Security Considerations

- Running as a non-root user improves container security
- The kubeconfig file contains sensitive credentials and should be handled securely
- Consider using Kubernetes RBAC to limit the permissions of the service account used by Trivy Glass

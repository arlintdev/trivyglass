# Trivy Glass Helm Chart

This Helm chart deploys Trivy Glass, a dashboard for visualizing Trivy security scan results.

## Prerequisites

Trivy Glass requires Trivy Operator to be installed in your cluster. If you haven't installed it yet, you can do so with the following commands:

```bash
helm repo add aqua https://aquasecurity.github.io/helm-charts/
helm repo update

helm install trivy-operator aqua/trivy-operator \
     --namespace trivy-system \
     --create-namespace \
     --version 0.26.1
```

## Installation

```bash
helm install trivy-glass ./chart
```

## Configuration

The following table lists the configurable parameters of the Trivy Glass chart and their default values.

### Image Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | Image repository | `ghcr.io/arlintdev/trivyglass` |
| `image.tag` | Image tag | `latest` |
| `image.pullPolicy` | Image pull policy | `Always` |
| `image.pullSecrets` | Image pull secrets | `[]` |

### Redis Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.image.repository` | Redis image repository | `redis` |
| `redis.image.tag` | Redis image tag | `6.2.17` |
| `redis.persistence.enabled` | Enable Redis persistence | `false` |
| `redis.persistence.size` | Storage size for Redis data | `1Gi` |
| `redis.persistence.storageClass` | Storage class for Redis PVC | `""` |
| `redis.resources.requests.cpu` | CPU requests for Redis | `100m` |
| `redis.resources.requests.memory` | Memory requests for Redis | `128Mi` |
| `redis.resources.limits.cpu` | CPU limits for Redis | `500m` |
| `redis.resources.limits.memory` | Memory limits for Redis | `256Mi` |

### Application Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `settings.cluster` | Cluster name | `yourcluster` |
| `settings.env` | Additional environment variables | `[]` |

### Service Account Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `serviceAccount.create` | Create service account (required for the app to work) | `true` |
| `serviceAccount.name` | Service account name | `trivy-glass` |
| `serviceAccount.annotations` | Service account annotations | `{}` |

### ConfigMap Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `configMap.enabled` | Enable ConfigMap | `false` |
| `configMap.name` | ConfigMap name | `apps-config` |
| `configMap.data` | ConfigMap data | `{}` |

### Deployment Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `deployment.replicas` | Number of replicas | `1` |
| `deployment.annotations` | Pod annotations | `{}` |
| `deployment.resources.requests.cpu` | CPU requests for the main container | `100m` |
| `deployment.resources.requests.memory` | Memory requests for the main container | `128Mi` |
| `deployment.resources.limits.cpu` | CPU limits for the main container | `500m` |
| `deployment.resources.limits.memory` | Memory limits for the main container | `512Mi` |
| `deployment.nodeSelector` | Node selector for pod assignment | `{}` |
| `deployment.tolerations` | Tolerations for pod assignment | `[]` |
| `deployment.affinity` | Affinity for pod assignment | `{}` |
| `deployment.podSecurityContext` | Security context for the pod | `{}` |
| `deployment.securityContext` | Security context for the main container | `{}` |

### Service Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `service.type` | Service type | `ClusterIP` |
| `service.port` | Service port | `3000` |
| `service.nodePort` | Node port (when service type is NodePort) | `null` |
| `service.annotations` | Service annotations | `{}` |

### Labels

| Parameter | Description | Default |
|-----------|-------------|---------|
| `labels` | Additional labels to add to all resources | `{}` |

## Example Values

```yaml
# Minimal configuration
image:
  repository: ghcr.io/arlintdev/trivyglass
  tag: latest

settings:
  cluster: "production"

# Advanced configuration
deployment:
  replicas: 2
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  nodeSelector:
    kubernetes.io/os: linux

service:
  type: NodePort
  nodePort: 30080

redis:
  persistence:
    enabled: true
    size: 5Gi
    storageClass: standard
  resources:
    limits:
      memory: 512Mi
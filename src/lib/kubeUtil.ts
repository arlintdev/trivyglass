import { KubeConfig, CustomObjectsApi } from '@kubernetes/client-node';
import redis from 'redis'; // Import default export

// Destructure what you need from the default export
const { createClient } = redis;

// Load kubeconfig only once
const kubeConfig: KubeConfig = (() => {
  const config = new KubeConfig();
  if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
    config.loadFromCluster();
  } else {
    config.loadFromDefault();
  }
  return config;
})();

const clusterName: string = kubeConfig.getCurrentCluster()?.name || 'Unknown Cluster';

// Initialize Redis client
const redisClient = createClient({
  url: 'redis://localhost:6379', // For local testing
  // password: 'testpassword', // Uncomment if you set a password
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Connect to Redis when the module loads
(async () => {
  try {
    await redisClient.connect();
  } catch (err: any) {
    console.error('Failed to connect to Redis:', err.message);
  }
})();

const CACHE_DURATION = 30 * 60; // Cache duration in seconds

export interface ColumnDefinition {
  name: string;
  description?: string;
  jsonPath: string;
  type: string;
  priority?: number;
}

export interface CRDMetadata {
  group: string;
  plural: string;
  columns: ColumnDefinition[];
  scope: string;
}

export interface ReportsData {
  manifests: any[];
  clusterName: string;
  scope: string;
  error?: string;
  resource?: string;
}

// Helper: Extract value from an object based on JSON path
function extractValue(obj: any, jsonPath: string): any {
  if (!obj || !jsonPath) return undefined;
  const parts = jsonPath.split('.').slice(1); // Skip leading dot
  let value = obj;
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }
  if (value && (jsonPath.endsWith('Timestamp') || jsonPath.includes('creation'))) {
    return new Date(value).toLocaleString() || value;
  }
  return value;
}

// Helper: Extract column definitions from version info
function getColumnDefinitions(versionInfo: any): ColumnDefinition[] {
  if (!versionInfo) {
    return [];
  }
  return versionInfo.additionalPrinterColumns?.map((col: any) => ({
    name: col.name,
    description: col.description,
    jsonPath: col.jsonPath,
    type: col.type,
    priority: col.priority,
  })) || [];
}

// Exported function: List all Aqua Security CRDs
export async function listAllAquaSecurityCRDs(): Promise<CRDMetadata[]> {
  const cacheKey = 'aqua_security_crds';
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    return JSON.parse(cachedData);
  }

  try {
    const customObjectsApi = kubeConfig.makeApiClient(CustomObjectsApi);
    const response = await customObjectsApi.listClusterCustomObject({
      group: 'apiextensions.k8s.io',
      version: 'v1',
      plural: 'customresourcedefinitions',
    });
    const items = (response as any).items || [];
    const crds = items
      .filter((crd: any) => crd.spec.group === 'aquasecurity.github.io' && crd.spec.scope !== 'Namespaced')
      .map((crd: any) => {
        const versionInfo = crd.spec.versions.find((v: any) => v.name === 'v1alpha1');
        const columns = getColumnDefinitions(versionInfo);
        return {
          group: 'aquasecurity.github.io',
          plural: crd.spec.names.plural,
          columns,
          scope: crd.spec.scope,
        };
      });

    await redisClient.setEx(cacheKey, CACHE_DURATION, JSON.stringify(crds));
    return crds;
  } catch (err: any) {
    return [];
  }
}

export interface ReportsData {
  manifests: any[]; // Will contain only metadata and column values
  clusterName: string;
  scope: string;
  error?: string;
  resource?: string;
}

// Exported function: Load reports for a specific CRD
export async function loadReports(crdPlural: string): Promise<ReportsData> {
  const cacheKey = `reports:${crdPlural}`;
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    const parsedData = JSON.parse(cachedData) as ReportsData;
    return parsedData;
  }

  const customObjectsApi = kubeConfig.makeApiClient(CustomObjectsApi);
  try {
    // Fetch CRD metadata to determine scope
    const crdName = `${crdPlural}.aquasecurity.github.io`;
    const crdResponse = await customObjectsApi.getClusterCustomObject({
      group: 'apiextensions.k8s.io',
      version: 'v1',
      plural: 'customresourcedefinitions',
      name: crdName,
    });
    const crdSpec = (crdResponse as any).spec;
    if (!crdSpec) {
      throw new Error(`CRD ${crdName} did not return a valid spec`);
    }

    const versionInfo = crdSpec.versions.find((v: any) => v.name === 'v1alpha1');
    if (!versionInfo) {
      throw new Error(`No v1alpha1 version found for ${crdName}`);
    }
    let columns = getColumnDefinitions(versionInfo);
    if (columns.length === 0) {
      columns = [
        { name: 'Name', jsonPath: '.metadata.name', type: 'string' },
        { name: 'Age', jsonPath: '.metadata.creationTimestamp', type: 'date' },
      ];
    }

    // Determine scope and fetch items accordingly
    const scope = crdSpec.scope || 'Cluster';
    let items: any[] = [];
    if (scope === 'Namespaced') {
      try {
        const result = await customObjectsApi.listCustomObjectForAllNamespaces({
          group: 'aquasecurity.github.io',
          version: 'v1alpha1',
          plural: crdPlural,
        });
        items = (result as any).items || [];
      } catch (listErr: any) {
        items = [];
      }
    } else {
      try {
        const result = await customObjectsApi.listClusterCustomObject({
          group: 'aquasecurity.github.io',
          version: 'v1alpha1',
          plural: crdPlural,
        });
        items = (result as any).items || [];
      } catch (listErr: any) {
        items = [];
      }
    }

    // Transform items to include only metadata and column values
    const filteredReports = items.map((item) => {
      const reportData: { [key: string]: any } = {
        metadata: item.metadata || {},
      };
      columns.forEach((col) => {
        const value = extractValue(item, col.jsonPath);
        reportData[col.name] = value !== undefined ? value : null;
      });
      return reportData;
    });

    const data: ReportsData = {
      manifests: filteredReports,
      clusterName,
      scope,
      resource: crdPlural,
    };

    await redisClient.setEx(cacheKey, CACHE_DURATION, JSON.stringify(data));

    return data;
  } catch (err: any) {
    const data: ReportsData = {
      manifests: [],
      clusterName: 'Unknown Cluster',
      scope: 'Unknown',
      error: err.message,
      resource: crdPlural,
    };
    await redisClient.setEx(cacheKey, CACHE_DURATION, JSON.stringify(data));
    return data;
  }
}

// Exported function: Invalidate cache for a specific CRD
export async function invalidateCache(crdPlural: string): Promise<void> {
  const cacheKey = `reports:${crdPlural}`;
  await redisClient.del(cacheKey);
}

// Cleanup Redis connection on process exit
process.on('SIGINT', async () => {
  await redisClient.quit();
  process.exit(0);
});
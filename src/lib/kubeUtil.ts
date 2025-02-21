import { KubeConfig, CustomObjectsApi } from '@kubernetes/client-node';

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

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache: Record<string, CacheEntry> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
  reports: any[];
  clusterName: string;
  columns: ColumnDefinition[];
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
  return versionInfo?.additionalPrinterColumns?.map((col: any) => ({
    name: col.name,
    description: col.description,
    jsonPath: col.jsonPath,
    type: col.type,
    priority: col.priority,
  })) || [];
}

// Exported function: List all Aqua Security CRDs
export async function listAllAquaSecurityCRDs(): Promise<CRDMetadata[]> {
  try {
    const customObjectsApi = kubeConfig.makeApiClient(CustomObjectsApi);
    const response = await customObjectsApi.listClusterCustomObject({
      group: 'apiextensions.k8s.io',
      version: 'v1',
      plural: 'customresourcedefinitions',
    });
    const items = (response as any).items || [];
    return items
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
  } catch (err: any) {
    console.error(`Critical error fetching Aqua CRDs: ${err.message}`);
    return [];
  }
}

// Exported function: Load reports for a given CRD
export async function loadReports(crdPlural: string): Promise<ReportsData> {
  const now = Date.now();
  if (cache[crdPlural] && now - cache[crdPlural].timestamp < CACHE_DURATION) {
    console.log(`Using cache for ${crdPlural}`);
    return cache[crdPlural].data;
  }
  console.log(`Renewing cache for ${crdPlural}`);
  const customObjectsApi = kubeConfig.makeApiClient(CustomObjectsApi);
  try {
    let items: any[] = [];
    try {
      const result = await customObjectsApi.listCustomObjectForAllNamespaces({
        group: 'aquasecurity.github.io',
        version: 'v1alpha1',
        plural: crdPlural,
      });
      items = (result as any).items || [];
    } catch (listErr: any) {
      console.warn(`Warning: Could not list instances of ${crdPlural}: ${listErr.message}`);
      items = [];
    }
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
    let columns = getColumnDefinitions(versionInfo);
    if (columns.length === 0) {
      columns = [
        { name: 'Name', jsonPath: '.metadata.name', type: 'string' },
        { name: 'Age', jsonPath: '.metadata.creationTimestamp', type: 'date' },
      ];
    }
    console.log(`Fetched ${items.length} instances of ${crdPlural}`);
    const data: ReportsData = {
      reports: items,
      clusterName,
      columns,
      scope: crdSpec.scope || 'Cluster',
      resource: crdPlural,
    };
    cache[crdPlural] = { data, timestamp: now };
    return data;
  } catch (err: any) {
    console.error(`Critical error fetching ${crdPlural}: ${err.message}`);
    const data: ReportsData = {
      reports: [],
      clusterName: 'Unknown Cluster',
      columns: [],
      scope: 'Unknown',
      error: err.message,
      resource: crdPlural,
    };
    console.log(data)
    cache[crdPlural] = { data, timestamp: now };
    return data;
  }
}

// Exported function: Invalidate cache for a specific CRD
export function invalidateCache(crdPlural: string): void {
  delete cache[crdPlural];
}
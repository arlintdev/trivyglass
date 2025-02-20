import { KubeConfig, CustomObjectsApi } from '@kubernetes/client-node';

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
}

// Helper function to extract values from a resource based on JSON path
function extractValue(obj: any, jsonPath: string): any {
    if (!obj || !jsonPath) return undefined;

    const parts = jsonPath.split('.').slice(1); // Skip the leading dot
    let value = obj;

    for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
            value = value[part];
        } else {
            return undefined;
        }
    }

    // Handle special cases (e.g., dates)
    if (value && (jsonPath.endsWith('Timestamp') || jsonPath.includes('creation'))) {
        return new Date(value).toLocaleString() || value;
    }

    return value;
}


export async function listAllAquaSecurityCRDs(): Promise<CRDMetadata[]> {
    const kc = new KubeConfig();
    let clusterName = 'Unknown Cluster';
    const CRD_GROUP = 'aquasecurity.github.io';
    const CRD_VERSION = 'v1alpha1';

    try {
        // Load KubeConfig based on environment
        if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
            kc.loadFromCluster();
            clusterName = kc.getCurrentCluster()?.name || clusterName;
        } else {
            kc.loadFromDefault();
            clusterName = kc.getCurrentCluster()?.name || clusterName;
        }

        const customObjectsApi = kc.makeApiClient(CustomObjectsApi);
        const crdList = await customObjectsApi.listClusterCustomObject({
            group: 'apiextensions.k8s.io',
            version: 'v1',
            plural: 'customresourcedefinitions',
        });

        const crds = (crdList as any).items || [];
        const aquaCRDs: CRDMetadata[] = crds
            .filter((crd: any) => crd.spec.group === CRD_GROUP && crd.spec.scope !== 'Namespaced')
            .map((crd: any) => {
                const versionInfo = crd.spec.versions.find((v: any) => v.name === CRD_VERSION);
                const columns: ColumnDefinition[] = versionInfo?.additionalPrinterColumns.map((col: any) => ({
                    name: col.name,
                    description: col.description,
                    jsonPath: col.jsonPath,
                    type: col.type,
                    priority: col.priority,
                })) || [];

                return {
                    group: CRD_GROUP,
                    plural: crd.spec.names.plural,
                    columns,
                    scope: crd.spec.scope,
                };
            });

        return aquaCRDs;
    } catch (err: any) {
        console.error(`Critical error fetching Aqua CRDs: ${err.message}`);
        return [];
    }
}



export async function loadReports(crdPlural: string): Promise<ReportsData> {
    const now = Date.now();
    if (cache[crdPlural] && now - cache[crdPlural].timestamp < CACHE_DURATION) {
        console.log(`Using cache for ${crdPlural}`);
        return cache[crdPlural].data;
    }

    console.log(`Renewing cache for ${crdPlural}`);
    const kc = new KubeConfig();
    let clusterName = 'Unknown Cluster';

    try {
        // Load KubeConfig based on environment
        if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
            kc.loadFromCluster();
            clusterName = kc.getCurrentCluster()?.name || clusterName;
        } else {
            kc.loadFromDefault();
            clusterName = kc.getCurrentCluster()?.name || clusterName;
        }

        const customObjectsApi = kc.makeApiClient(CustomObjectsApi);
        const CRD_GROUP = 'aquasecurity.github.io';
        const CRD_VERSION = 'v1alpha1';

        // Fetch resource instances
        let items: any[] = [];
        try {
            const result = await customObjectsApi.listCustomObjectForAllNamespaces({
                group: CRD_GROUP,
                version: CRD_VERSION,
                plural: crdPlural,
            });
            items = (result as any).items || [];
        } catch (listErr) {
            console.warn(`Warning: Could not list instances of ${crdPlural}: ${listErr.message}`);
            items = []; // Continue with CRD fetch even if instances fail
        }

        const crdName = `${crdPlural}.aquasecurity.github.io`;
        const crdResult = await customObjectsApi.getClusterCustomObject({
            group: 'apiextensions.k8s.io',
            version: 'v1',
            plural: 'customresourcedefinitions',
            name: crdName,
        });
        console.log(crdResult);
        const crdSpec = (crdResult as any).spec;
        if (!crdSpec) {
            throw new Error(`CRD ${crdName} did not return a valid spec`);
        }

        // Extract columns from CRD
        const versionInfo = crdSpec.versions.find((v: any) => v.name === CRD_VERSION);
        const columns: ColumnDefinition[] = versionInfo?.additionalPrinterColumns.map((col: any) => ({
            name: col.name,
            description: col.description,
            jsonPath: col.jsonPath,
            type: col.type,
            priority: col.priority,
        })) || [];

        // Add default columns if none are defined
        if (!columns.length) {
            columns.push(
                { name: 'Name', jsonPath: '.metadata.name', type: 'string' },
                { name: 'Age', jsonPath: '.metadata.creationTimestamp', type: 'date' }
            );
        }
        console.log(`Fetched ${items.length} instances of ${crdPlural}`);
        const data: ReportsData = {
            reports: items,
            clusterName,
            columns,
            scope: crdSpec.scope || 'Cluster',
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
        };
        cache[crdPlural] = { data, timestamp: now };
        return data;
    }
}

// Function to invalidate cache for a specific CRD
export function invalidateCache(crdPlural: string): void {
    delete cache[crdPlural];
}
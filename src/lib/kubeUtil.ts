import { KubeConfig, CustomObjectsApi } from '@kubernetes/client-node';
import redis from 'redis'; // Import default export

// Destructure what you need from the default export
const { createClient } = redis;

// Load kubeconfig only once
const kubeConfig: KubeConfig = (() => {
	const config = new KubeConfig();
	if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
		console.log('Loading kubeconfig from cluster configuration');
		config.loadFromCluster();
	} else {
		console.log('Loading kubeconfig from default configuration');
		config.loadFromDefault();
	}
	return config;
})();

const clusterName: string = kubeConfig.getCurrentCluster()?.name || 'Unknown Cluster';
console.log(`Current cluster: ${clusterName}`);

// Initialize Redis client
const redisClient = createClient({
	url: 'redis://localhost:6379' // For local testing
	// password: 'testpassword', // Uncomment if you set a password
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Connect to Redis when the module loads
(async () => {
	try {
		console.log('Connecting to Redis...');
		await redisClient.connect();
		console.log('Successfully connected to Redis');
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
		console.log('No version info provided for extracting columns');
		return [];
	}
	console.log('Extracting column definitions from version info');
	return (
		versionInfo.additionalPrinterColumns?.map((col: any) => ({
			name: col.name,
			description: col.description,
			jsonPath: col.jsonPath,
			type: col.type,
			priority: col.priority
		})) || []
	);
}

// Exported function: List all Aqua Security CRDs
export async function listAllAquaSecurityCRDs(): Promise<CRDMetadata[]> {
	console.log('Listing all Aqua Security CRDs');
	const cacheKey = 'aqua_security_crds';
	const cachedData = await redisClient.get(cacheKey);

	if (cachedData) {
		console.log('Using Redis cache for Aqua CRDs');
		return JSON.parse(cachedData);
	}

	try {
		const customObjectsApi = kubeConfig.makeApiClient(CustomObjectsApi);
		const response = await customObjectsApi.listClusterCustomObject({
			group: 'apiextensions.k8s.io',
			version: 'v1',
			plural: 'customresourcedefinitions'
		});
		const items = (response as any).items || [];
		console.log(`Fetched ${items.length} CRDs from Kubernetes API`);
		const crds = items
			.filter(
				(crd: any) => crd.spec.group === 'aquasecurity.github.io' && crd.spec.scope !== 'Namespaced'
			)
			.map((crd: any) => {
				const versionInfo = crd.spec.versions.find((v: any) => v.name === 'v1alpha1');
				const columns = getColumnDefinitions(versionInfo);
				console.log(`Processed CRD ${crd.metadata.name} with ${columns.length} columns`);
				return {
					group: 'aquasecurity.github.io',
					plural: crd.spec.names.plural,
					columns,
					scope: crd.spec.scope
				};
			});

		await redisClient.setEx(cacheKey, CACHE_DURATION, JSON.stringify(crds));
		console.log('Cached Aqua CRDs in Redis');
		return crds;
	} catch (err: any) {
		console.error(`Critical error fetching Aqua CRDs: ${err.message}`);
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
	console.log(`Loading reports for CRD: ${crdPlural}`);
	const cacheKey = `reports:${crdPlural}`;
	const cachedData = await redisClient.get(cacheKey);

	if (cachedData) {
		console.log(`Using Redis cache for ${crdPlural}`);
		const parsedData = JSON.parse(cachedData) as ReportsData;
		console.log('Retrieved from cache:', JSON.stringify(parsedData, null, 2));
		return parsedData;
	}

	console.log(`Fetching and caching reports for ${crdPlural}`);
	const customObjectsApi = kubeConfig.makeApiClient(CustomObjectsApi);
	try {
		// Fetch CRD metadata to determine scope
		const crdName = `${crdPlural}.aquasecurity.github.io`;
		console.log(`Fetching CRD spec for ${crdName}`);
		const crdResponse = await customObjectsApi.getClusterCustomObject({
			group: 'apiextensions.k8s.io',
			version: 'v1',
			plural: 'customresourcedefinitions',
			name: crdName
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
			console.log('No additional printer columns found, using default columns');
			columns = [
				{ name: 'Name', jsonPath: '.metadata.name', type: 'string' },
				{ name: 'Age', jsonPath: '.metadata.creationTimestamp', type: 'date' }
			];
		}

		// Determine scope and fetch items accordingly
		const scope = crdSpec.scope || 'Cluster';
		let items: any[] = [];
		console.log(`CRD ${crdPlural} is ${scope}-scoped`);
		if (scope === 'Namespaced') {
			try {
				const result = await customObjectsApi.listCustomObjectForAllNamespaces({
					group: 'aquasecurity.github.io',
					version: 'v1alpha1',
					plural: crdPlural
				});
				items = (result as any).items || [];
			} catch (listErr: any) {
				console.warn(
					`Warning: Could not list namespaced instances of ${crdPlural}: ${listErr.message}`
				);
				items = [];
			}
		} else {
			try {
				const result = await customObjectsApi.listClusterCustomObject({
					group: 'aquasecurity.github.io',
					version: 'v1alpha1',
					plural: crdPlural
				});
				items = (result as any).items || [];
			} catch (listErr: any) {
				console.warn(
					`Warning: Could not list cluster instances of ${crdPlural}: ${listErr.message}`
				);
				items = [];
			}
		}

		console.log(`Fetched ${items.length} instances for ${crdPlural}`);

		// Transform items to include only metadata and column values
		const filteredReports = items.map((item) => {
			const reportData: { [key: string]: any } = {
				metadata: item.metadata || {}
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
			resource: crdPlural
		};

		await redisClient.setEx(cacheKey, CACHE_DURATION, JSON.stringify(data));

		return data;
	} catch (err: any) {
		console.error(`Critical error fetching ${crdPlural}: ${err.message}`);
		const data: ReportsData = {
			manifests: [],
			clusterName: 'Unknown Cluster',
			scope: 'Unknown',
			error: err.message,
			resource: crdPlural
		};
		await redisClient.setEx(cacheKey, CACHE_DURATION, JSON.stringify(data));
		return data;
	}
}

// Exported function: Invalidate cache for a specific CRD
export async function invalidateCache(crdPlural: string): Promise<void> {
	const cacheKey = `reports:${crdPlural}`;
	console.log(`Invalidating cache for ${crdPlural}`);
	await redisClient.del(cacheKey);
}

// Cleanup Redis connection on process exit
process.on('SIGINT', async () => {
	console.log('Received SIGINT, closing Redis connection...');
	await redisClient.quit();
	console.log('Redis connection closed, exiting process.');
	process.exit(0);
});

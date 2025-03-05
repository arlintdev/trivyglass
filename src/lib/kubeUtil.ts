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

const CACHE_DURATION = 30 * 60; // Cache duration in seconds

// Cache interface
interface Cache {
	get(key: string): Promise<string | null>;
	setEx(key: string, expiry: number, value: string): Promise<void>;
	del(key: string): Promise<void>;
}

// Redis cache implementation
class RedisCache implements Cache {
	private client: ReturnType<typeof createClient>;
	private connected: boolean = false;
	private connectionAttempted: boolean = false;

	constructor(redisUrl: string) {
		this.client = createClient({
			url: redisUrl,
			socket: {
				// Reduce connection timeout to fail faster when Redis is unavailable
				connectTimeout: 2000,
				// Disable reconnect attempts
				reconnectStrategy: false
			}
		});
		
		// Only log the first error, not every reconnect attempt
		this.client.on('error', (err) => {
			if (!this.connectionAttempted) {
				console.error('Redis Client Error:', err.message);
			}
		});
	}

	async connect(): Promise<boolean> {
		if (this.connectionAttempted) {
			return this.connected;
		}
		
		try {
			console.log('Attempting to connect to Redis...');
			this.connectionAttempted = true;
			await this.client.connect();
			this.connected = true;
			console.log('Successfully connected to Redis');
			return true;
		} catch (err: unknown) {
			console.error('Failed to connect to Redis:', err instanceof Error ? err.message : String(err));
			this.connected = false;
			return false;
		}
	}

	async get(key: string): Promise<string | null> {
		if (!this.connected) return null;
		return await this.client.get(key);
	}

	async setEx(key: string, expiry: number, value: string): Promise<void> {
		if (!this.connected) return;
		await this.client.setEx(key, expiry, value);
	}

	async del(key: string): Promise<void> {
		if (!this.connected) return;
		await this.client.del(key);
	}

	async quit(): Promise<void> {
		if (this.connected) {
			await this.client.quit();
			this.connected = false;
		}
	}

	isConnected(): boolean {
		return this.connected;
	}
}

// Local in-memory cache implementation
class LocalCache implements Cache {
	private cache: Map<string, { value: string; expiry: number }> = new Map();

	constructor() {
		console.log('Using local in-memory cache');
		// Periodically clean up expired entries
		setInterval(() => this.cleanupExpired(), 60000); // Clean up every minute
	}

	async get(key: string): Promise<string | null> {
		const entry = this.cache.get(key);
		if (!entry) return null;
		
		// Check if entry has expired
		if (entry.expiry < Date.now()) {
			this.cache.delete(key);
			return null;
		}
		
		return entry.value;
	}

	async setEx(key: string, expiry: number, value: string): Promise<void> {
		// Convert expiry from seconds to milliseconds and add to current time
		const expiryTime = Date.now() + (expiry * 1000);
		this.cache.set(key, { value, expiry: expiryTime });
	}

	async del(key: string): Promise<void> {
		this.cache.delete(key);
	}

	private cleanupExpired(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (entry.expiry < now) {
				this.cache.delete(key);
			}
		}
	}
}

// Cache factory to get the appropriate cache implementation
class CacheFactory {
	private static instance: Cache | null = null;
	private static redisAttempted = false;

	static async getCache(): Promise<Cache> {
		// Return existing instance if we have one
		if (this.instance) {
			return this.instance;
		}

		// If we've already tried Redis and it failed, go straight to local cache
		if (this.redisAttempted) {
			this.instance = new LocalCache();
			return this.instance;
		}

		// Try Redis first (only on the first call)
		this.redisAttempted = true;
		const redisCache = new RedisCache('redis://localhost:6379');
		const connected = await redisCache.connect();
		
		if (connected) {
			this.instance = redisCache;
			return redisCache;
		}
		
		// Fall back to local cache
		console.log('Falling back to local in-memory cache');
		this.instance = new LocalCache();
		return this.instance;
	}
}

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
	manifests: unknown[];
	clusterName: string;
	scope: string;
	error?: string;
	resource?: string;
}

// Helper: Extract value from an object based on JSON path
function extractValue(obj: unknown, jsonPath: string): unknown {
	if (!obj || !jsonPath) return undefined;
	const parts = jsonPath.split('.').slice(1); // Skip leading dot
	let value: unknown = obj;
	for (const part of parts) {
		if (value && typeof value === 'object' && part in (value as Record<string, unknown>)) {
			value = (value as Record<string, unknown>)[part];
		} else {
			return undefined;
		}
	}
	if (value && (jsonPath.endsWith('Timestamp') || jsonPath.includes('creation'))) {
		return new Date(value as string).toLocaleString() || value;
	}
	return value;
}

// Helper: Extract column definitions from version info
function getColumnDefinitions(versionInfo: unknown): ColumnDefinition[] {
	if (!versionInfo) {
		console.log('No version info provided for extracting columns');
		return [];
	}
	console.log('Extracting column definitions from version info');
	return (
		(versionInfo as { additionalPrinterColumns?: unknown[] }).additionalPrinterColumns?.map((col: unknown) => ({
			name: (col as { name: string }).name,
			description: (col as { description?: string }).description,
			jsonPath: (col as { jsonPath: string }).jsonPath,
			type: (col as { type: string }).type,
			priority: (col as { priority?: number }).priority
		})) || []
	);
}

// Exported function: List all Aqua Security CRDs
export async function listAllAquaSecurityCRDs(): Promise<CRDMetadata[]> {
	console.log('Listing all Aqua Security CRDs');
	const cacheKey = 'aqua_security_crds';
	
	const cache = await CacheFactory.getCache();
	const cachedData = await cache.get(cacheKey);

	if (cachedData) {
		console.log('Using cache for Aqua CRDs');
		return JSON.parse(cachedData);
	}

	try {
		const customObjectsApi = kubeConfig.makeApiClient(CustomObjectsApi);
		const response = await customObjectsApi.listClusterCustomObject({
			group: 'apiextensions.k8s.io',
			version: 'v1',
			plural: 'customresourcedefinitions'
		});
		const items = (response as { items?: unknown[] }).items || [];
		console.log(`Fetched ${items.length} CRDs from Kubernetes API`);
		const crds = items
			.filter(
				(crd: unknown) => 
					(crd as { spec: { group: string; scope: string } }).spec.group === 'aquasecurity.github.io' && 
					(crd as { spec: { group: string; scope: string } }).spec.scope !== 'Namespaced'
			)
			.map((crd: unknown) => {
				const typedCrd = crd as { 
					spec: { 
						versions: { name: string }[]; 
						names: { plural: string };
						scope: string;
					};
					metadata: { name: string };
				};
				const versionInfo = typedCrd.spec.versions.find((v) => v.name === 'v1alpha1');
				const columns = getColumnDefinitions(versionInfo);
				console.log(`Processed CRD ${typedCrd.metadata.name} with ${columns.length} columns`);
				return {
					group: 'aquasecurity.github.io',
					plural: typedCrd.spec.names.plural,
					columns,
					scope: typedCrd.spec.scope
				};
			});

		await cache.setEx(cacheKey, CACHE_DURATION, JSON.stringify(crds));
		console.log('Cached Aqua CRDs');
		return crds;
	} catch (err: unknown) {
		console.error(`Critical error fetching Aqua CRDs: ${err instanceof Error ? err.message : String(err)}`);
		return [];
	}
}

// Exported function: Load reports for a specific CRD
export async function loadReports(crdPlural: string): Promise<ReportsData> {
	console.log(`Loading reports for CRD: ${crdPlural}`);
	const cacheKey = `reports:${crdPlural}`;
	
	const cache = await CacheFactory.getCache();
	const cachedData = await cache.get(cacheKey);

	if (cachedData) {
		console.log(`Using cache for ${crdPlural}`);
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
		const crdSpec = (crdResponse as { spec?: unknown }).spec;
		if (!crdSpec) {
			throw new Error(`CRD ${crdName} did not return a valid spec`);
		}

		const typedCrdSpec = crdSpec as { 
			versions: { name: string }[];
			scope?: string;
		};
		
		const versionInfo = typedCrdSpec.versions.find((v) => v.name === 'v1alpha1');
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
		const scope = typedCrdSpec.scope || 'Cluster';
		let items: unknown[] = [];
		console.log(`CRD ${crdPlural} is ${scope}-scoped`);
		if (scope === 'Namespaced') {
			try {
				const result = await customObjectsApi.listCustomObjectForAllNamespaces({
					group: 'aquasecurity.github.io',
					version: 'v1alpha1',
					plural: crdPlural
				});
				items = (result as { items?: unknown[] }).items || [];
			} catch (listErr: unknown) {
				console.warn(
					`Warning: Could not list namespaced instances of ${crdPlural}: ${listErr instanceof Error ? listErr.message : String(listErr)}`
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
				items = (result as { items?: unknown[] }).items || [];
			} catch (listErr: unknown) {
				console.warn(
					`Warning: Could not list cluster instances of ${crdPlural}: ${listErr instanceof Error ? listErr.message : String(listErr)}`
				);
				items = [];
			}
		}

		console.log(`Fetched ${items.length} instances for ${crdPlural}`);

		// Transform items to include only metadata and column values
		const filteredReports = items.map((item: unknown) => {
			const reportData: Record<string, unknown> = {
				metadata: (item as { metadata?: unknown }).metadata || {}
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

		await cache.setEx(cacheKey, CACHE_DURATION, JSON.stringify(data));

		return data;
	} catch (err: unknown) {
		console.error(`Critical error fetching ${crdPlural}: ${err instanceof Error ? err.message : String(err)}`);
		const data: ReportsData = {
			manifests: [],
			clusterName: 'Unknown Cluster',
			scope: 'Unknown',
			error: err instanceof Error ? err.message : String(err),
			resource: crdPlural
		};
		await cache.setEx(cacheKey, CACHE_DURATION, JSON.stringify(data));
		return data;
	}
}

// Exported function: Invalidate cache for a specific CRD
export async function invalidateCache(crdPlural: string): Promise<void> {
	const cacheKey = `reports:${crdPlural}`;
	console.log(`Invalidating cache for ${crdPlural}`);
	const cache = await CacheFactory.getCache();
	await cache.del(cacheKey);
}

// Cleanup on process exit
process.on('SIGINT', async () => {
	console.log('Received SIGINT, cleaning up...');
	const cache = await CacheFactory.getCache();
	if (cache instanceof RedisCache) {
		await cache.quit();
		console.log('Redis connection closed');
	}
	console.log('Exiting process.');
	process.exit(0);
});

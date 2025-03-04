import { KubeConfig, CustomObjectsApi } from '@kubernetes/client-node';
import redis from 'redis'; // Import default export
import crypto from 'crypto';
import yaml from 'js-yaml';

// Destructure what you need from the default export
const { createClient } = redis;

// Encryption settings
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'xxxyyuuuqqq11223xxxyyuuuqqq11223'; // Must be 256 bits (32 characters)
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

// Track the current active cluster name
let activeClusterName: string = 'local';

// Store kubeconfig instances for each cluster
const kubeConfigs: Record<string, KubeConfig> = {};

// Get the kubeconfig for the current active cluster
async function getKubeConfig(): Promise<KubeConfig> {
    console.log(`[DEBUG] getKubeConfig called for cluster: ${activeClusterName}`);
    
    // Check if we already have a kubeconfig for this cluster
    if (kubeConfigs[activeClusterName]) {
        console.log(`[DEBUG] Using cached kubeconfig for cluster: ${activeClusterName}`);
        
        // Verify the current context of the cached config
        const currentContext = kubeConfigs[activeClusterName].getCurrentContext();
        console.log(`[DEBUG] Current context in cached config: ${currentContext}`);
        
        return kubeConfigs[activeClusterName];
    }
    
    // Create a new kubeconfig
    console.log(`[DEBUG] Creating new kubeconfig for cluster: ${activeClusterName}`);
    const config = new KubeConfig();
    
    if (activeClusterName === 'local') {
        // Load from environment or default
        if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
            console.log('[DEBUG] Loading kubeconfig from cluster configuration');
            config.loadFromCluster();
        } else {
            console.log('[DEBUG] Loading kubeconfig from default configuration');
            config.loadFromDefault();
        }
    } else {
        // For non-local clusters, load from Redis
        console.log(`[DEBUG] Loading kubeconfig for non-local cluster: ${activeClusterName}`);
        const clusterData = await getCluster(activeClusterName);
        if (!clusterData) {
            console.error(`[DEBUG] No cluster data found for: ${activeClusterName}`);
            throw new Error(`Cluster ${activeClusterName} not found`);
        }
        
        const kubeConfigYaml = decryptKubeconfig(clusterData.encryptedData, clusterData.iv);
        config.loadFromString(kubeConfigYaml);
        
        // Verify the loaded config
        const contexts = config.getContexts();
        console.log(`[DEBUG] Loaded contexts: ${contexts.map(c => c.name).join(', ')}`);
        
        // Set the current context to match the cluster name
        const matchingContext = contexts.find(c => c.name === activeClusterName);
        if (matchingContext) {
            console.log(`[DEBUG] Setting current context to: ${matchingContext.name}`);
            config.setCurrentContext(matchingContext.name);
        } else {
            console.warn(`[DEBUG] No matching context found for: ${activeClusterName}`);
        }
    }
    
    // Verify the current context after loading
    const currentContext = config.getCurrentContext();
    console.log(`[DEBUG] Current context after loading: ${currentContext}`);
    
    // Cache the kubeconfig
    kubeConfigs[activeClusterName] = config;
    return config;
}

// Initialize Redis client
const redisClient = createClient({
	url: process.env.REDIS_URL || 'redis://localhost:6379' // For local testing
	// password: 'testpassword', // Uncomment if you set a password
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Connect to Redis when the module loads
(async () => {
	try {
		console.log('Connecting to Redis...');
		await redisClient.connect();
		console.log('Successfully connected to Redis');
	} catch (err: unknown) {
		if (err instanceof Error) {
			console.error('Failed to connect to Redis:', err.message);
		} else {
			console.error('Failed to connect to Redis with unknown error');
		}
	}
})();

// Encryption utilities
interface EncryptedData {
	encryptedData: string;
	iv: string;
}

/**
 * Encrypts a kubeconfig string
 * @param kubeconfig The kubeconfig string to encrypt
 * @returns Object containing the encrypted data and initialization vector
 */
export function encryptKubeconfig(kubeconfig: string): EncryptedData {
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv(
		ENCRYPTION_ALGORITHM,
		Buffer.from(ENCRYPTION_KEY),
		iv
	);
	let encrypted = cipher.update(kubeconfig, 'utf8', 'hex');
	encrypted += cipher.final('hex');
	return {
		encryptedData: encrypted,
		iv: iv.toString('hex')
	};
}

/**
 * Decrypts an encrypted kubeconfig
 * @param encryptedData The encrypted kubeconfig data
 * @param iv The initialization vector used for encryption
 * @returns The decrypted kubeconfig string
 */
export function decryptKubeconfig(encryptedData: string, iv: string): string {
	const decipher = crypto.createDecipheriv(
		ENCRYPTION_ALGORITHM,
		Buffer.from(ENCRYPTION_KEY),
		Buffer.from(iv, 'hex')
	);
	let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
	decrypted += decipher.final('utf8');
	return decrypted;
}

// Cluster management interfaces
export interface ClusterData {
	name: string;
	encryptedData: string;
	iv: string;
	createdAt: string;
}

export interface ClusterInfo {
	name: string;
	isLocal?: boolean;
	createdAt?: string;
}

/**
 * Parse a kubeconfig YAML and extract context names
 * @param kubeconfig The kubeconfig content as a string
 * @returns Array of context names
 */
export function extractContextNames(kubeconfig: string): string[] {
	try {
		const config = yaml.load(kubeconfig) as Record<string, any>;
		
		if (!config || !config.contexts || !Array.isArray(config.contexts)) {
			return [];
		}
		
		return config.contexts.map((context: Record<string, any>) => {
			return context.name || 'unknown';
		});
	} catch (error) {
		console.error('Error parsing kubeconfig:', error);
		return [];
	}
}

/**
 * Stores a kubeconfig in Redis with encryption
 * @param kubeconfig The kubeconfig content as a string
 * @returns Array of saved context names
 */
export async function saveCluster(kubeconfig: string): Promise<string[]> {
	console.log('[DEBUG] Saving cluster configuration');
	
	// Extract context names from the kubeconfig
	const contextNames = extractContextNames(kubeconfig);
	
	if (contextNames.length === 0) {
		throw new Error('No valid contexts found in the kubeconfig');
	}
	
	console.log(`[DEBUG] Found contexts: ${contextNames.join(', ')}`);
	
	// Parse the kubeconfig
	const config = yaml.load(kubeconfig) as Record<string, any>;
	if (!config) {
		throw new Error('Invalid kubeconfig format');
	}
	
	const savedContexts: string[] = [];
	
	// Save each context with a modified kubeconfig that has the correct default
	for (const name of contextNames) {
		console.log(`[DEBUG] Processing context: ${name}`);
		
		// Create a deep copy of the config for this context
		const contextConfig = JSON.parse(JSON.stringify(config));
		
		// Set the current-context to this context name
		contextConfig['current-context'] = name;
		console.log(`[DEBUG] Set current-context to: ${name}`);
		
		// Filter to only include this context and its related clusters/users
		if (contextConfig.contexts) {
			const thisContext = contextConfig.contexts.find((ctx: any) => ctx.name === name);
			if (thisContext) {
				// Keep only this context
				contextConfig.contexts = [thisContext];
				
				// Find the cluster and user referenced by this context
				const clusterName = thisContext.context?.cluster;
				const userName = thisContext.context?.user;
				
				console.log(`[DEBUG] Context ${name} references cluster: ${clusterName}, user: ${userName}`);
				
				// Filter clusters to only include the one referenced by this context
				if (clusterName && contextConfig.clusters) {
					contextConfig.clusters = contextConfig.clusters.filter(
						(cluster: any) => cluster.name === clusterName
					);
				}
				
				// Filter users to only include the one referenced by this context
				if (userName && contextConfig.users) {
					contextConfig.users = contextConfig.users.filter(
						(user: any) => user.name === userName
					);
				}
			}
		}
		
		// Convert back to YAML
		const contextYaml = yaml.dump(contextConfig);
		console.log(`[DEBUG] Created context-specific kubeconfig for: ${name}`);
		
		// Encrypt the context-specific kubeconfig
		const { encryptedData, iv } = encryptKubeconfig(contextYaml);
		
		// Save to Redis
		const clusterData: ClusterData = {
			name,
			encryptedData,
			iv,
			createdAt: new Date().toISOString()
		};
		
		await redisClient.hSet('kubeconfigs', name, JSON.stringify(clusterData));
		await redisClient.sAdd('cluster_names', name);
		savedContexts.push(name);
		console.log(`[DEBUG] Saved cluster configuration for ${name}`);
	}
	
	return savedContexts;
}

/**
 * Lists all available clusters
 * @returns Array of cluster names with 'local' first
 */
export async function listClusters(): Promise<ClusterInfo[]> {
	const defaultCluster: ClusterInfo = { name: 'local', isLocal: true };
	const clusterNames = await redisClient.sMembers('cluster_names');
	
	// Get details for each cluster
	const clusters: ClusterInfo[] = await Promise.all(
		clusterNames.map(async (name) => {
			const data = await redisClient.hGet('kubeconfigs', name);
			if (!data) return { name };
			
			const clusterData = JSON.parse(data) as ClusterData;
			return {
				name: clusterData.name,
				createdAt: clusterData.createdAt
			};
		})
	);
	
	// Ensure 'local' is first in the list
	return [defaultCluster, ...clusters.filter(c => c.name !== 'local')];
}

/**
 * Gets a specific cluster's data
 * @param name The name of the cluster to retrieve
 * @returns The cluster data or null if not found
 */
export async function getCluster(name: string): Promise<ClusterData | null> {
	if (name === 'local') {
		return null; // Local cluster doesn't have stored data
	}
	
	const clusterData = await redisClient.hGet('kubeconfigs', name);
	if (!clusterData) {
		return null;
	}
	
	return JSON.parse(clusterData) as ClusterData;
}

/**
 * Deletes a cluster configuration
 * @param name The name of the cluster to delete
 * @throws Error if trying to delete the local cluster
 */
export async function deleteCluster(name: string): Promise<void> {
	if (name === 'local') {
		throw new Error('Cannot delete local cluster');
	}
	
	await redisClient.hDel('kubeconfigs', name);
	await redisClient.sRem('cluster_names', name);
	console.log(`Deleted cluster configuration for ${name}`);
}

/**
 * Gets the current active cluster name
 * @returns The name of the current active cluster
 */
export function getCurrentClusterName(): string {
	// Return our tracked active cluster name
	return activeClusterName;
}

/**
 * Switches to a different cluster
 * @param name The name of the cluster to switch to
 * @throws Error if the cluster doesn't exist
 */
export async function switchCluster(name: string): Promise<void> {
	console.log(`Switching to cluster: ${name}`);
	
	// Update our tracked active cluster name immediately
	activeClusterName = name;
	console.log(`Updated activeClusterName to: ${activeClusterName}`);
	
	// Clear any existing kubeconfig for this cluster
	if (kubeConfigs[name]) {
		delete kubeConfigs[name];
		console.log(`Cleared cached kubeconfig for cluster: ${name}`);
	}
	
	if (name === 'local') {
		// For local cluster, we'll create the config on-demand when needed
		console.log('Local cluster will be configured on-demand');
	} else {
		const clusterData = await getCluster(name);
		if (!clusterData) {
			throw new Error(`Cluster ${name} not found`);
		}
		
		const kubeConfigYaml = decryptKubeconfig(clusterData.encryptedData, clusterData.iv);
		
		// Load the kubeconfig from the decrypted YAML
		const config = new KubeConfig();
		config.loadFromString(kubeConfigYaml);
		
		// Store in our cache
		kubeConfigs[name] = config;
		console.log(`Loaded and cached kubeconfig for cluster: ${name}`);
	}
	
	// Clear caches to ensure fresh data is loaded
	// Make cache keys cluster-specific
	await redisClient.del(`aqua_security_crds:${activeClusterName}`);
	
	// Clear other caches as needed - make them cluster-specific
	const cacheKeys = await redisClient.keys(`reports:${activeClusterName}:*`);
	if (cacheKeys.length > 0) {
		await redisClient.del(cacheKeys);
		console.log(`Cleared ${cacheKeys.length} report caches for cluster: ${activeClusterName}`);
	}
}

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
	console.log(`Listing all Aqua Security CRDs for cluster: ${activeClusterName}`);
	
	// Make cache key cluster-specific
	const cacheKey = `aqua_security_crds:${activeClusterName}`;
	const cachedData = await redisClient.get(cacheKey);

	if (cachedData) {
		console.log(`Using Redis cache for Aqua CRDs (cluster: ${activeClusterName})`);
		return JSON.parse(cachedData);
	}

	try {
		// Get the kubeconfig for the current cluster
		console.log(`[DEBUG] Getting kubeconfig for cluster: ${activeClusterName}`);
		const config = await getKubeConfig();
		
		// Verify the current context
		const currentContext = config.getCurrentContext();
		console.log(`[DEBUG] Current context before API call: ${currentContext}`);
		
		const customObjectsApi = config.makeApiClient(CustomObjectsApi);
		
		console.log(`[DEBUG] Fetching CRDs from Kubernetes API for cluster: ${activeClusterName}`);
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

		// Store in cluster-specific cache
		await redisClient.setEx(cacheKey, CACHE_DURATION, JSON.stringify(crds));
		console.log(`Cached Aqua CRDs in Redis for cluster: ${activeClusterName}`);
		return crds;
	} catch (err: any) {
		console.error(`Critical error fetching Aqua CRDs for cluster ${activeClusterName}: ${err.message}`);
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
	console.log(`Loading reports for CRD: ${crdPlural} (cluster: ${activeClusterName})`);
	
	// Make cache key cluster-specific
	const cacheKey = `reports:${activeClusterName}:${crdPlural}`;
	const cachedData = await redisClient.get(cacheKey);

	if (cachedData) {
		console.log(`Using Redis cache for ${crdPlural} (cluster: ${activeClusterName})`);
		const parsedData = JSON.parse(cachedData) as ReportsData;
		console.log('Retrieved from cache:', JSON.stringify(parsedData, null, 2));
		return parsedData;
	}

	console.log(`[DEBUG] Fetching and caching reports for ${crdPlural} (cluster: ${activeClusterName})`);
	
	try {
		// Get the kubeconfig for the current cluster
		console.log(`[DEBUG] Getting kubeconfig for cluster: ${activeClusterName}`);
		const config = await getKubeConfig();
		
		// Verify the current context
		const currentContext = config.getCurrentContext();
		console.log(`[DEBUG] Current context before API call: ${currentContext}`);
		
		const customObjectsApi = config.makeApiClient(CustomObjectsApi);
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
			clusterName: activeClusterName,
			scope,
			resource: crdPlural
		};

		// Store in cluster-specific cache
		await redisClient.setEx(cacheKey, CACHE_DURATION, JSON.stringify(data));
		console.log(`Cached reports for ${crdPlural} in Redis (cluster: ${activeClusterName})`);

		return data;
	} catch (err: any) {
		console.error(`Critical error fetching ${crdPlural} for cluster ${activeClusterName}: ${err.message}`);
		const data: ReportsData = {
			manifests: [],
			clusterName: activeClusterName || 'Unknown Cluster',
			scope: 'Unknown',
			error: err.message,
			resource: crdPlural
		};
		// Still cache the error response to prevent repeated failures
		await redisClient.setEx(cacheKey, CACHE_DURATION / 2, JSON.stringify(data)); // Cache errors for half the normal duration
		return data;
	}
}

// Exported function: Invalidate cache for a specific CRD
export async function invalidateCache(crdPlural: string): Promise<void> {
	// Make cache key cluster-specific
	const cacheKey = `reports:${activeClusterName}:${crdPlural}`;
	console.log(`Invalidating cache for ${crdPlural} (cluster: ${activeClusterName})`);
	await redisClient.del(cacheKey);
}

/**
 * Get a specific namespaced resource
 * @param resource The resource type (plural name)
 * @param namespace The namespace
 * @param name The resource name
 * @param group The API group (defaults to 'aquasecurity.github.io')
 * @param version The API version (defaults to 'v1alpha1')
 * @returns The resource manifest and metadata
 */
export async function getNamespacedResource(
	resource: string,
	namespace: string,
	name: string,
	group: string = 'aquasecurity.github.io',
	version: string = 'v1alpha1'
): Promise<{ manifest: any; clusterName: string; namespace: string; resource: string; name: string; error?: string }> {
	console.log(`[DEBUG] Getting namespaced resource: ${resource}/${name} in namespace ${namespace}`);
	
	try {
		// Get the kubeconfig for the current cluster
		const config = await getKubeConfig();
		const customObjectsApi = config.makeApiClient(CustomObjectsApi);
		
		try {
			const result = await customObjectsApi.getNamespacedCustomObject({
				group,
				version,
				namespace,
				plural: resource,
				name
			});
			
			return {
				manifest: result,
				clusterName: activeClusterName,
				namespace,
				resource,
				name
			};
		} catch (apiErr: any) {
			// Handle API errors
			console.error(`API Error getting namespaced resource ${resource}/${name} in ${namespace}: ${apiErr.message}`);
			
			// Extract the response body if available for better error messages
			let errorMessage = apiErr.message;
			if (apiErr.response && apiErr.response.body) {
				try {
					const responseBody = typeof apiErr.response.body === 'string'
						? JSON.parse(apiErr.response.body)
						: apiErr.response.body;
					
					if (responseBody.message) {
						errorMessage = responseBody.message;
					}
				} catch (parseErr) {
					// If we can't parse the body, just use the original error message
					console.error('Error parsing error response body:', parseErr);
				}
			}
			
			return {
				manifest: null,
				clusterName: activeClusterName,
				namespace,
				resource,
				name,
				error: errorMessage
			};
		}
	} catch (err: any) {
		// Handle other errors (like connection issues)
		console.error(`Error getting namespaced resource ${resource}/${name} in ${namespace}: ${err.message}`);
		return {
			manifest: null,
			clusterName: activeClusterName,
			namespace,
			resource,
			name,
			error: `Failed to connect to Kubernetes API: ${err.message}`
		};
	}
}

/**
 * Get a specific cluster-scoped resource
 * @param resource The resource type (plural name)
 * @param name The resource name
 * @param group The API group (defaults to 'aquasecurity.github.io')
 * @param version The API version (defaults to 'v1alpha1')
 * @returns The resource manifest and metadata
 */
export async function getClusterResource(
	resource: string,
	name: string,
	group: string = 'aquasecurity.github.io',
	version: string = 'v1alpha1'
): Promise<{ manifest: any; clusterName: string; resource: string; name: string; error?: string }> {
	console.log(`[DEBUG] Getting cluster resource: ${resource}/${name}`);
	
	try {
		// Get the kubeconfig for the current cluster
		const config = await getKubeConfig();
		const customObjectsApi = config.makeApiClient(CustomObjectsApi);
		
		try {
			const result = await customObjectsApi.getClusterCustomObject({
				group,
				version,
				plural: resource,
				name
			});
			
			return {
				manifest: result,
				clusterName: activeClusterName,
				resource,
				name
			};
		} catch (apiErr: any) {
			// Handle API errors
			console.error(`API Error getting cluster resource ${resource}/${name}: ${apiErr.message}`);
			
			// Extract the response body if available for better error messages
			let errorMessage = apiErr.message;
			if (apiErr.response && apiErr.response.body) {
				try {
					const responseBody = typeof apiErr.response.body === 'string'
						? JSON.parse(apiErr.response.body)
						: apiErr.response.body;
					
					if (responseBody.message) {
						errorMessage = responseBody.message;
					}
				} catch (parseErr) {
					// If we can't parse the body, just use the original error message
					console.error('Error parsing error response body:', parseErr);
				}
			}
			
			return {
				manifest: null,
				clusterName: activeClusterName,
				resource,
				name,
				error: errorMessage
			};
		}
	} catch (err: any) {
		// Handle other errors (like connection issues)
		console.error(`Error getting cluster resource ${resource}/${name}: ${err.message}`);
		return {
			manifest: null,
			clusterName: activeClusterName,
			resource,
			name,
			error: `Failed to connect to Kubernetes API: ${err.message}`
		};
	}
}

// Cleanup Redis connection on process exit
process.on('SIGINT', async () => {
	console.log('Received SIGINT, closing Redis connection...');
	await redisClient.quit();
	console.log('Redis connection closed, exiting process.');
	process.exit(0);
});

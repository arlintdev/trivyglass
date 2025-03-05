import { KubeConfig, CustomObjectsApi } from '@kubernetes/client-node';
import redis from 'redis'; // Import default export
import crypto from 'crypto';
import yaml from 'js-yaml';

// Define log levels
enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  NONE = 5
}

/**
 * Logger class for structured logging with different levels
 */
class Logger {
  private static currentLogLevel: LogLevel = LogLevel.INFO; // Default log level
  private static logPrefix: string = 'KubeUtil';

  /**
   * Set the current log level
   * @param level The log level to set
   */
  static setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  /**
   * Set the log prefix
   * @param prefix The prefix to use for all logs
   */
  static setLogPrefix(prefix: string): void {
    this.logPrefix = prefix;
  }

  /**
   * Log a message at TRACE level
   * @param message The message to log
   * @param context Optional context object to include
   */
  static trace(message: string, context?: unknown): void {
    if (this.currentLogLevel <= LogLevel.TRACE) {
      console.log(`[TRACE] [${this.logPrefix}] ${message}`, context ? context : '');
    }
  }
  
  /**
   * Log a message at DEBUG level
   * @param message The message to log
   * @param context Optional context object to include
   */
  static debug(message: string, context?: unknown): void {
    if (this.currentLogLevel <= LogLevel.DEBUG) {
      console.log(`[DEBUG] [${this.logPrefix}] ${message}`, context ? context : '');
    }
  }
  
  /**
   * Log a message at INFO level
   * @param message The message to log
   * @param context Optional context object to include
   */
  static info(message: string, context?: unknown): void {
    if (this.currentLogLevel <= LogLevel.INFO) {
      console.log(`[INFO] [${this.logPrefix}] ${message}`, context ? context : '');
    }
  }
  
  /**
   * Log a message at WARN level
   * @param message The message to log
   * @param context Optional context object to include
   */
  static warn(message: string, context?: unknown): void {
    if (this.currentLogLevel <= LogLevel.WARN) {
      console.warn(`[WARN] [${this.logPrefix}] ${message}`, context ? context : '');
    }
  }
  
  /**
   * Log a message at ERROR level
   * @param message The message to log
   * @param context Optional context object to include
   */
  static error(message: string, context?: unknown): void {
    if (this.currentLogLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] [${this.logPrefix}] ${message}`, context ? context : '');
    }
  }
}

// Set log level from environment variable if available
if (process.env.LOG_LEVEL) {
  const envLogLevel = process.env.LOG_LEVEL.toUpperCase();
  if (envLogLevel === 'TRACE') Logger.setLogLevel(LogLevel.TRACE);
  else if (envLogLevel === 'DEBUG') Logger.setLogLevel(LogLevel.DEBUG);
  else if (envLogLevel === 'INFO') Logger.setLogLevel(LogLevel.INFO);
  else if (envLogLevel === 'WARN') Logger.setLogLevel(LogLevel.WARN);
  else if (envLogLevel === 'ERROR') Logger.setLogLevel(LogLevel.ERROR);
  else if (envLogLevel === 'NONE') Logger.setLogLevel(LogLevel.NONE);
}

// Destructure what you need from the default export
const { createClient } = redis;

// Encryption settings
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'xxxyyuuuqqq11223xxxyyuuuqqq11223'; // Must be 256 bits (32 characters)
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

// Track the current active cluster name
let activeClusterName: string = 'local';

// Store kubeconfig instances for each cluster
const kubeConfigs: Record<string, KubeConfig> = {};

// Cache duration in seconds
const CACHE_DURATION = 30 * 60;

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
  Logger.debug('Encrypting kubeconfig');
  const iv = crypto.randomBytes(16);
  Logger.trace('Generated initialization vector for encryption');
  
  const cipher = crypto.createCipheriv(
    ENCRYPTION_ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  
  let encrypted = cipher.update(kubeconfig, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  Logger.trace('Kubeconfig encrypted successfully');
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
  Logger.debug('Decrypting kubeconfig');
  
  try {
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(ENCRYPTION_KEY),
      Buffer.from(iv, 'hex')
    );
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    Logger.trace('Kubeconfig decrypted successfully');
    return decrypted;
  } catch (err) {
    Logger.error('Failed to decrypt kubeconfig', err);
    throw new Error('Failed to decrypt kubeconfig: ' + (err instanceof Error ? err.message : String(err)));
  }
}

// Cache interface
interface Cache {
  get(key: string): Promise<string | null | undefined>;
  setEx(key: string, expiry: number, value: string): Promise<void>;
  del(key: string): Promise<void>;
  hGet?(hash: string, field: string): Promise<string | null | undefined>;
  hSet?(hash: string, field: string, value: string): Promise<void>;
  hDel?(hash: string, field: string): Promise<void>;
  sMembers?(key: string): Promise<string[]>;
  sAdd?(key: string, member: string): Promise<void>;
  sRem?(key: string, member: string): Promise<void>;
  keys?(pattern: string): Promise<string[]>;
  quit?(): Promise<void>;
}

// Redis cache implementation
class RedisCache implements Cache {
  // Using a more specific type for the Redis client
  private client: ReturnType<typeof createClient>;
  private connected: boolean = false;
  private connectionAttempted: boolean = false;

  constructor(redisUrl: string) {
    Logger.debug(`Initializing Redis client with URL: ${redisUrl}`);
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
        Logger.error('Redis Client Error:', err instanceof Error ? err.message : String(err));
      }
    });
  }

  async connect(): Promise<boolean> {
    if (this.connectionAttempted) {
      return this.connected;
    }
    
    try {
      Logger.info('Attempting to connect to Redis...');
      this.connectionAttempted = true;
      await this.client.connect();
      this.connected = true;
      Logger.info('Successfully connected to Redis');
      return true;
    } catch (err: unknown) {
      Logger.error('Failed to connect to Redis:', err instanceof Error ? err.message : String(err));
      this.connected = false;
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.connected) return null;
    try {
      // Force the type to be string | null
      return (await this.client.get(key) || null) as string | null;
    } catch (err) {
      Logger.error(`Error getting key ${key} from Redis:`, err);
      return null;
    }
  }

  async setEx(key: string, expiry: number, value: string): Promise<void> {
    if (!this.connected) return;
    await this.client.setEx(key, expiry, value);
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;
    await this.client.del(key);
  }

  async hGet(hash: string, field: string): Promise<string | null> {
    if (!this.connected) return null;
    return await this.client.hGet(hash, field);
  }

  async hSet(hash: string, field: string, value: string): Promise<void> {
    if (!this.connected) return;
    await this.client.hSet(hash, field, value);
  }

  async hDel(hash: string, field: string): Promise<void> {
    if (!this.connected) return;
    await this.client.hDel(hash, field);
  }

  async sMembers(key: string): Promise<string[]> {
    if (!this.connected) return [];
    return await this.client.sMembers(key);
  }

  async sAdd(key: string, member: string): Promise<void> {
    if (!this.connected) return;
    await this.client.sAdd(key, member);
  }

  async sRem(key: string, member: string): Promise<void> {
    if (!this.connected) return;
    await this.client.sRem(key, member);
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.connected) return [];
    return await this.client.keys(pattern);
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
  private hashMaps: Map<string, Map<string, string>> = new Map();
  private sets: Map<string, Set<string>> = new Map();

  constructor() {
    Logger.info('Using local in-memory cache');
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

  // Hash map operations
  async hGet(hash: string, field: string): Promise<string | null> {
    const hashMap = this.hashMaps.get(hash);
    if (!hashMap) return null;
    return hashMap.get(field) || null;
  }

  async hSet(hash: string, field: string, value: string): Promise<void> {
    let hashMap = this.hashMaps.get(hash);
    if (!hashMap) {
      hashMap = new Map<string, string>();
      this.hashMaps.set(hash, hashMap);
    }
    hashMap.set(field, value);
  }

  async hDel(hash: string, field: string): Promise<void> {
    const hashMap = this.hashMaps.get(hash);
    if (hashMap) {
      hashMap.delete(field);
    }
  }

  // Set operations
  async sMembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    if (!set) return [];
    return Array.from(set);
  }

  async sAdd(key: string, member: string): Promise<void> {
    let set = this.sets.get(key);
    if (!set) {
      set = new Set<string>();
      this.sets.set(key, set);
    }
    set.add(member);
  }

  async sRem(key: string, member: string): Promise<void> {
    const set = this.sets.get(key);
    if (set) {
      set.delete(member);
    }
  }

  // Pattern matching for keys (simplified implementation)
  async keys(pattern: string): Promise<string[]> {
    const result: string[] = [];
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        result.push(key);
      }
    }
    
    return result;
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
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisCache = new RedisCache(redisUrl);
    const connected = await redisCache.connect();
    
    if (connected) {
      this.instance = redisCache;
      return redisCache;
    }
    
    // Fall back to local cache
    Logger.info('Falling back to local in-memory cache');
    this.instance = new LocalCache();
    return this.instance;
  }
}

// Get the kubeconfig for the current active cluster
async function getKubeConfig(): Promise<KubeConfig> {
  Logger.debug(`Getting kubeconfig for cluster: ${activeClusterName}`);
  
  // Check if we already have a kubeconfig for this cluster
  if (kubeConfigs[activeClusterName]) {
    Logger.trace(`Using cached kubeconfig for cluster: ${activeClusterName}`);
    return kubeConfigs[activeClusterName];
  }
  
  // Create a new kubeconfig
  Logger.debug(`Creating new kubeconfig for cluster: ${activeClusterName}`);
  const config = new KubeConfig();
  
  if (activeClusterName === 'local') {
    // Load from environment or default
    if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
      Logger.info('Loading kubeconfig from in-cluster environment');
      config.loadFromCluster();
    } else {
      Logger.info('Loading kubeconfig from default location');
      config.loadFromDefault();
    }
  } else {
    // For non-local clusters, load from cache
    Logger.debug(`Loading cluster data for: ${activeClusterName} from cache`);
    const clusterData = await getCluster(activeClusterName);
    if (!clusterData) {
      Logger.error(`Cluster not found: ${activeClusterName}`);
      throw new Error(`Cluster ${activeClusterName} not found`);
    }
    
    Logger.debug(`Decrypting kubeconfig for cluster: ${activeClusterName}`);
    const kubeConfigYaml = decryptKubeconfig(clusterData.encryptedData, clusterData.iv);
    config.loadFromString(kubeConfigYaml);
    
    // Verify the loaded config
    Logger.trace(`Verifying contexts in loaded kubeconfig`);
    const contexts = config.getContexts();
    
    // Set the current context to match the cluster name
    const matchingContext = contexts.find(c => c.name === activeClusterName);
    if (matchingContext) {
      Logger.debug(`Setting current context to: ${matchingContext.name}`);
      config.setCurrentContext(matchingContext.name);
    } else {
      Logger.warn(`No matching context found for cluster: ${activeClusterName}`);
    }
  }
  
  // Cache the kubeconfig
  Logger.debug(`Caching kubeconfig for cluster: ${activeClusterName}`);
  kubeConfigs[activeClusterName] = config;
  return config;
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
  Logger.debug('Extracting context names from kubeconfig');
  try {
    const config = yaml.load(kubeconfig) as Record<string, unknown>;
    
    if (!config || !config.contexts || !Array.isArray(config.contexts)) {
      Logger.warn('No valid contexts found in kubeconfig');
      return [];
    }
    
    const contextNames = config.contexts.map((context: Record<string, unknown>) => {
      return (context.name as string) || 'unknown';
    });
    
    Logger.debug(`Extracted ${contextNames.length} context names`, { contextNames });
    return contextNames;
  } catch (error) {
    Logger.error('Failed to parse kubeconfig YAML', error);
    return [];
  }
}

/**
 * Stores a kubeconfig in cache with encryption
 * @param kubeconfig The kubeconfig content as a string
 * @returns Array of saved context names
 */
export async function saveCluster(kubeconfig: string): Promise<string[]> {
  Logger.info('Saving cluster configuration');
  
  // Extract context names from the kubeconfig
  const contextNames = extractContextNames(kubeconfig);
  
  if (contextNames.length === 0) {
    Logger.error('No valid contexts found in the kubeconfig');
    throw new Error('No valid contexts found in the kubeconfig');
  }
  
  // Parse the kubeconfig
  Logger.debug('Parsing kubeconfig YAML');
  const config = yaml.load(kubeconfig) as Record<string, unknown>;
  if (!config) {
    Logger.error('Invalid kubeconfig format');
    throw new Error('Invalid kubeconfig format');
  }
  
  const savedContexts: string[] = [];
  Logger.info(`Processing ${contextNames.length} contexts from kubeconfig`);
  
  // Get cache instance
  const cache = await CacheFactory.getCache();
  
  // Save each context with a modified kubeconfig that has the correct default
  for (const name of contextNames) {
    Logger.debug(`Processing context: ${name}`);
    
    // Create a deep copy of the config for this context
    const contextConfig = JSON.parse(JSON.stringify(config));
    
    // Set the current-context to this context name
    contextConfig['current-context'] = name;
    
    // Filter to only include this context and its related clusters/users
    if (contextConfig.contexts) {
      const thisContext = (contextConfig.contexts as Record<string, unknown>[]).find(
        (ctx) => (ctx.name as string) === name
      );
      if (thisContext) {
        Logger.trace(`Found matching context: ${name}`);
        // Keep only this context
        contextConfig.contexts = [thisContext];
        
        // Find the cluster and user referenced by this context
        const contextDetails = thisContext.context as Record<string, unknown> | undefined;
        const clusterName = contextDetails?.cluster as string | undefined;
        const userName = contextDetails?.user as string | undefined;
        Logger.trace(`Context references cluster: ${clusterName}, user: ${userName}`);
        
        // Filter clusters to only include the one referenced by this context
        if (clusterName && contextConfig.clusters) {
          Logger.trace(`Filtering to include only cluster: ${clusterName}`);
          contextConfig.clusters = (contextConfig.clusters as Record<string, unknown>[]).filter(
            (cluster) => (cluster.name as string) === clusterName
          );
        }
        
        // Filter users to only include the one referenced by this context
        if (userName && contextConfig.users) {
          Logger.trace(`Filtering to include only user: ${userName}`);
          contextConfig.users = (contextConfig.users as Record<string, unknown>[]).filter(
            (user) => (user.name as string) === userName
          );
        }
      } else {
        Logger.warn(`Context ${name} not found in contexts array`);
      }
    }
    
    // Convert back to YAML
    Logger.debug(`Converting context ${name} back to YAML`);
    const contextYaml = yaml.dump(contextConfig);
    
    // Encrypt the context-specific kubeconfig
    Logger.debug(`Encrypting context ${name} configuration`);
    const { encryptedData, iv } = encryptKubeconfig(contextYaml);
    
    // Save to cache
    Logger.debug(`Saving context ${name} to cache`);
    const clusterData: ClusterData = {
      name,
      encryptedData,
      iv,
      createdAt: new Date().toISOString()
    };
    
    if (cache.hSet) {
      await cache.hSet('kubeconfigs', name, JSON.stringify(clusterData));
      if (cache.sAdd) {
        await cache.sAdd('cluster_names', name);
      }
      savedContexts.push(name);
      Logger.info(`Saved context ${name} successfully`);
    } else {
      Logger.error('Cache implementation does not support hash operations');
      throw new Error('Cache implementation does not support hash operations');
    }
  }
  
  Logger.info(`Saved ${savedContexts.length} contexts to cache`);
  return savedContexts;
}

/**
 * Lists all available clusters
 * @returns Array of cluster names with 'local' first
 */
export async function listClusters(): Promise<ClusterInfo[]> {
  Logger.debug('Listing all available clusters');
  const defaultCluster: ClusterInfo = { name: 'local', isLocal: true };
  
  try {
    const cache = await CacheFactory.getCache();
    
    if (!cache.sMembers) {
      Logger.warn('Cache implementation does not support set operations, returning only local cluster');
      return [defaultCluster];
    }
    
    const clusterNames = await cache.sMembers('cluster_names');
    Logger.debug(`Found ${clusterNames.length} clusters in cache`);
    
    // Get details for each cluster
    const clusters: ClusterInfo[] = await Promise.all(
      clusterNames.map(async (name) => {
        Logger.trace(`Getting details for cluster: ${name}`);
        if (!cache.hGet) {
          return { name };
        }
        
        const data = await cache.hGet('kubeconfigs', name);
        if (!data) {
          Logger.warn(`No data found for cluster: ${name}`);
          return { name };
        }
        
        const clusterData = JSON.parse(data) as ClusterData;
        return {
          name: clusterData.name,
          createdAt: clusterData.createdAt
        };
      })
    );
    
    // Ensure 'local' is first in the list
    Logger.debug(`Returning ${clusters.length + 1} clusters (including local)`);
    return [defaultCluster, ...clusters.filter(c => c.name !== 'local')];
  } catch (err) {
    Logger.error('Error listing clusters', err);
    // Return at least the local cluster on error
    return [defaultCluster];
  }
}

/**
 * Gets a specific cluster's data
 * @param name The name of the cluster to retrieve
 * @returns The cluster data or null if not found
 */
export async function getCluster(name: string): Promise<ClusterData | null> {
  Logger.debug(`Getting cluster data for: ${name}`);
  
  if (name === 'local') {
    Logger.debug('Local cluster requested, returning null as it has no stored data');
    return null; // Local cluster doesn't have stored data
  }
  
  try {
    const cache = await CacheFactory.getCache();
    
    if (!cache.hGet) {
      Logger.error('Cache implementation does not support hash operations');
      return null;
    }
    
    const clusterData = await cache.hGet('kubeconfigs', name);
    if (!clusterData) {
      Logger.warn(`Cluster not found: ${name}`);
      return null;
    }
    
    Logger.trace(`Retrieved data for cluster: ${name}`);
    return JSON.parse(clusterData) as ClusterData;
  } catch (err) {
    Logger.error(`Error retrieving cluster data for: ${name}`, err);
    return null;
  }
}

/**
 * Deletes a cluster configuration
 * @param name The name of the cluster to delete
 * @throws Error if trying to delete the local cluster
 */
export async function deleteCluster(name: string): Promise<void> {
  Logger.info(`Deleting cluster configuration: ${name}`);
  
  if (name === 'local') {
    Logger.error('Attempted to delete local cluster, which is not allowed');
    throw new Error('Cannot delete local cluster');
  }
  
  try {
    const cache = await CacheFactory.getCache();
    
    if (!cache.hDel || !cache.sRem) {
      Logger.error('Cache implementation does not support required operations');
      throw new Error('Cache implementation does not support required operations');
    }
    
    Logger.debug(`Removing cluster ${name} from cache hash`);
    await cache.hDel('kubeconfigs', name);
    
    Logger.debug(`Removing cluster ${name} from cluster names set`);
    await cache.sRem('cluster_names', name);
    
    Logger.info(`Successfully deleted cluster: ${name}`);
  } catch (err) {
    Logger.error(`Failed to delete cluster: ${name}`, err);
    throw err; // Re-throw to let caller handle it
  }
}

/**
 * Gets the current active cluster name
 * @returns The name of the current active cluster
 */
export function getCurrentClusterName(): string {
  Logger.trace(`Getting current active cluster name: ${activeClusterName}`);
  return activeClusterName;
}

/**
 * Switches to a different cluster
 * @param name The name of the cluster to switch to
 * @throws Error if the cluster doesn't exist
 */
export async function switchCluster(name: string): Promise<void> {
  Logger.info(`Switching to cluster: ${name}`);
  
  // Update our tracked active cluster name immediately
  const previousCluster = activeClusterName;
  activeClusterName = name;
  Logger.debug(`Active cluster changed from ${previousCluster} to ${name}`);
  
  // Clear any existing kubeconfig for this cluster
  if (kubeConfigs[name]) {
    Logger.debug(`Clearing cached kubeconfig for cluster: ${name}`);
    delete kubeConfigs[name];
  }
  
  if (name === 'local') {
    Logger.debug('Local cluster selected, will create config on-demand when needed');
  } else {
    Logger.debug(`Loading cluster data for: ${name}`);
    const clusterData = await getCluster(name);
    if (!clusterData) {
      Logger.error(`Cluster not found: ${name}`);
      throw new Error(`Cluster ${name} not found`);
    }
    
    Logger.debug(`Decrypting kubeconfig for cluster: ${name}`);
    const kubeConfigYaml = decryptKubeconfig(clusterData.encryptedData, clusterData.iv);
    
    // Load the kubeconfig from the decrypted YAML
    Logger.debug(`Loading kubeconfig from string for cluster: ${name}`);
    const config = new KubeConfig();
    config.loadFromString(kubeConfigYaml);
    
    // Store in our cache
    Logger.debug(`Storing kubeconfig in cache for cluster: ${name}`);
    kubeConfigs[name] = config;
  }
  
  // Clear caches to ensure fresh data is loaded
  const cache = await CacheFactory.getCache();
  
  Logger.debug(`Clearing CRD cache for cluster: ${activeClusterName}`);
  await cache.del(`aqua_security_crds:${activeClusterName}`);
  
  // Clear other caches as needed - make them cluster-specific
  if (cache.keys) {
    Logger.debug(`Clearing report caches for cluster: ${activeClusterName}`);
    const cacheKeys = await cache.keys(`reports:${activeClusterName}:*`);
    if (cacheKeys.length > 0) {
      Logger.debug(`Found ${cacheKeys.length} report cache keys to clear`);
      for (const key of cacheKeys) {
        await cache.del(key);
      }
    }
  }
  
  Logger.info(`Successfully switched to cluster: ${name}`);
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
    return [];
  }
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
  Logger.info(`Listing Aqua Security CRDs for cluster: ${activeClusterName}`);
  
  // Make cache key cluster-specific
  const cacheKey = `aqua_security_crds:${activeClusterName}`;
  
  const cache = await CacheFactory.getCache();
  const cachedData = await cache.get(cacheKey);

  if (cachedData) {
    Logger.debug('Using cache for Aqua CRDs');
    return JSON.parse(cachedData);
  }

  try {
    Logger.debug('No cached data found, fetching from Kubernetes API');
    // Get the kubeconfig for the current cluster
    const config = await getKubeConfig();
    
    Logger.debug('Creating CustomObjectsApi client');
    const customObjectsApi = config.makeApiClient(CustomObjectsApi);
    
    Logger.debug('Listing cluster custom objects (CRDs)');
    const response = await customObjectsApi.listClusterCustomObject({
      group: 'apiextensions.k8s.io',
      version: 'v1',
      plural: 'customresourcedefinitions'
    });
    
    const items = (response as { items?: unknown[] }).items || [];
    Logger.debug(`Fetched ${items.length} CRDs from Kubernetes API`);
    
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
        Logger.trace(`Processed CRD ${typedCrd.metadata.name} with ${columns.length} columns`);
        return {
          group: 'aquasecurity.github.io',
          plural: typedCrd.spec.names.plural,
          columns,
          scope: typedCrd.spec.scope
        };
      });

    await cache.setEx(cacheKey, CACHE_DURATION, JSON.stringify(crds));
    Logger.info(`Cached ${crds.length} Aqua CRDs`);
    return crds;
  } catch (err: unknown) {
    Logger.error(`Critical error fetching Aqua CRDs: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

// Exported function: Load reports for a specific CRD
export async function loadReports(crdPlural: string): Promise<ReportsData> {
  Logger.info(`Loading reports for CRD: ${crdPlural} in cluster: ${activeClusterName}`);
  
  // Make cache key cluster-specific
  const cacheKey = `reports:${activeClusterName}:${crdPlural}`;
  
  const cache = await CacheFactory.getCache();
  const cachedData = await cache.get(cacheKey);

  if (cachedData) {
    Logger.debug(`Using cache for ${crdPlural}`);
    const parsedData = JSON.parse(cachedData) as ReportsData;
    return parsedData;
  }

  try {
    Logger.debug(`Fetching and caching reports for ${crdPlural}`);
    // Get the kubeconfig for the current cluster
    const config = await getKubeConfig();
    
    Logger.debug('Creating CustomObjectsApi client');
    const customObjectsApi = config.makeApiClient(CustomObjectsApi);
    
    // Fetch CRD metadata to determine scope
    const crdName = `${crdPlural}.aquasecurity.github.io`;
    Logger.debug(`Fetching CRD metadata for: ${crdName}`);
    const crdResponse = await customObjectsApi.getClusterCustomObject({
      group: 'apiextensions.k8s.io',
      version: 'v1',
      plural: 'customresourcedefinitions',
      name: crdName
    });
    
    const crdSpec = (crdResponse as { spec?: unknown }).spec;
    if (!crdSpec) {
      Logger.error(`CRD ${crdName} did not return a valid spec`);
      throw new Error(`CRD ${crdName} did not return a valid spec`);
    }

    const typedCrdSpec = crdSpec as { 
      versions: { name: string }[];
      scope?: string;
    };
    
    const versionInfo = typedCrdSpec.versions.find((v) => v.name === 'v1alpha1');
    if (!versionInfo) {
      Logger.error(`No v1alpha1 version found for ${crdName}`);
      throw new Error(`No v1alpha1 version found for ${crdName}`);
    }
    
    Logger.debug('Extracting column definitions from CRD');
    let columns = getColumnDefinitions(versionInfo);
    if (columns.length === 0) {
      Logger.debug('No column definitions found, using default columns');
      columns = [
        { name: 'Name', jsonPath: '.metadata.name', type: 'string' },
        { name: 'Age', jsonPath: '.metadata.creationTimestamp', type: 'date' }
      ];
    } else {
      Logger.debug(`Found ${columns.length} column definitions`);
    }
  
    // Determine scope and fetch items accordingly
    const scope = typedCrdSpec.scope || 'Cluster';
    let items: unknown[] = [];
    Logger.debug(`CRD ${crdPlural} is ${scope}-scoped`);
    
    if (scope === 'Namespaced') {
      Logger.debug(`Fetching namespaced resources for: ${crdPlural}`);
      try {
        const result = await customObjectsApi.listCustomObjectForAllNamespaces({
          group: 'aquasecurity.github.io',
          version: 'v1alpha1',
          plural: crdPlural
        });
        items = (result as { items?: unknown[] }).items || [];
      } catch (listErr: unknown) {
        Logger.warn(
          `Warning: Could not list namespaced instances of ${crdPlural}: ${listErr instanceof Error ? listErr.message : String(listErr)}`
        );
        items = [];
      }
    } else {
      Logger.debug(`Fetching cluster-scoped resources for: ${crdPlural}`);
      try {
        const result = await customObjectsApi.listClusterCustomObject({
          group: 'aquasecurity.github.io',
          version: 'v1alpha1',
          plural: crdPlural
        });
        items = (result as { items?: unknown[] }).items || [];
      } catch (listErr: unknown) {
        Logger.warn(
          `Warning: Could not list cluster instances of ${crdPlural}: ${listErr instanceof Error ? listErr.message : String(listErr)}`
        );
        items = [];
      }
    }
  
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
      clusterName: activeClusterName,
      scope,
      resource: crdPlural
    };

    await cache.setEx(cacheKey, CACHE_DURATION, JSON.stringify(data));
    Logger.info(`Successfully loaded ${filteredReports.length} reports for ${crdPlural}`);
    return data;
  } catch (err: unknown) {
    Logger.error(`Critical error fetching ${crdPlural}: ${err instanceof Error ? err.message : String(err)}`);
    const data: ReportsData = {
      manifests: [],
      clusterName: activeClusterName || 'Unknown Cluster',
      scope: 'Unknown',
      error: err instanceof Error ? err.message : String(err),
      resource: crdPlural
    };
    await cache.setEx(cacheKey, CACHE_DURATION / 2, JSON.stringify(data)); // Cache errors for half the normal duration
    return data;
  }
}

// Exported function: Invalidate cache for a specific CRD
export async function invalidateCache(crdPlural: string): Promise<void> {
  // Make cache key cluster-specific
  const cacheKey = `reports:${activeClusterName}:${crdPlural}`;
  Logger.info(`Invalidating cache for ${crdPlural} (cluster: ${activeClusterName})`);
  
  const cache = await CacheFactory.getCache();
  await cache.del(cacheKey);
  Logger.debug(`Successfully invalidated cache for key: ${cacheKey}`);
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
): Promise<{ manifest: unknown; clusterName: string; namespace: string; resource: string; name: string; error?: string }> {
  Logger.info(`Getting namespaced resource: ${resource}/${name} in namespace ${namespace}`);
  
  try {
    // Get the kubeconfig for the current cluster
    Logger.debug('Getting kubeconfig for current cluster');
    const config = await getKubeConfig();
    
    Logger.debug('Creating CustomObjectsApi client');
    const customObjectsApi = config.makeApiClient(CustomObjectsApi);
    
    try {
      Logger.debug(`Fetching namespaced resource: ${resource}/${name} in namespace ${namespace}`);
      const result = await customObjectsApi.getNamespacedCustomObject({
        group,
        version,
        namespace,
        plural: resource,
        name
      });
      
      Logger.debug('Successfully retrieved namespaced resource');
      return {
        manifest: result,
        clusterName: activeClusterName,
        namespace,
        resource,
        name
      };
    } catch (apiErr: unknown) {
      // Handle API errors
      Logger.error(`API Error getting namespaced resource ${resource}/${name} in ${namespace}: ${apiErr instanceof Error ? apiErr.message : String(apiErr)}`, apiErr);
      
      // Extract the response body if available for better error messages
      let errorMessage = apiErr instanceof Error ? apiErr.message : String(apiErr);
      
      // Type guard to check if apiErr has response property
      if (apiErr && typeof apiErr === 'object' && 'response' in apiErr) {
        const apiError = apiErr as { response?: { body?: unknown } };
        
        if (apiError.response && apiError.response.body) {
          try {
            Logger.debug('Attempting to parse error response body');
            const responseBody = typeof apiError.response.body === 'string'
              ? JSON.parse(apiError.response.body)
              : apiError.response.body;
            
            // Type guard to check if responseBody has message property
            if (responseBody && typeof responseBody === 'object' && 'message' in responseBody) {
              const typedBody = responseBody as { message: string };
              errorMessage = typedBody.message;
              Logger.debug(`Extracted error message from response body: ${errorMessage}`);
            }
          } catch (parseErr) {
            // If we can't parse the body, just use the original error message
            Logger.warn('Error parsing error response body', parseErr);
          }
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
  } catch (err: unknown) {
    // Handle other errors (like connection issues)
    Logger.error(`Error getting namespaced resource ${resource}/${name} in ${namespace}: ${err instanceof Error ? err.message : String(err)}`, err);
    return {
      manifest: null,
      clusterName: activeClusterName,
      namespace,
      resource,
      name,
      error: `Failed to connect to Kubernetes API: ${err instanceof Error ? err.message : String(err)}`
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
): Promise<{ manifest: unknown; clusterName: string; resource: string; name: string; error?: string }> {
  Logger.info(`Getting cluster resource: ${resource}/${name}`);
  
  try {
    // Get the kubeconfig for the current cluster
    Logger.debug('Getting kubeconfig for current cluster');
    const config = await getKubeConfig();
    
    Logger.debug('Creating CustomObjectsApi client');
    const customObjectsApi = config.makeApiClient(CustomObjectsApi);
    
    try {
      Logger.debug(`Fetching cluster resource: ${resource}/${name}`);
      const result = await customObjectsApi.getClusterCustomObject({
        group,
        version,
        plural: resource,
        name
      });
      
      Logger.debug('Successfully retrieved cluster resource');
      return {
        manifest: result,
        clusterName: activeClusterName,
        resource,
        name
      };
    } catch (apiErr: unknown) {
      // Handle API errors
      Logger.error(`API Error getting cluster resource ${resource}/${name}: ${apiErr instanceof Error ? apiErr.message : String(apiErr)}`, apiErr);
      
      // Extract the response body if available for better error messages
      let errorMessage = apiErr instanceof Error ? apiErr.message : String(apiErr);
      
      // Type guard to check if apiErr has response property
      if (apiErr && typeof apiErr === 'object' && 'response' in apiErr) {
        const apiError = apiErr as { response?: { body?: unknown } };
        
        if (apiError.response && apiError.response.body) {
          try {
            Logger.debug('Attempting to parse error response body');
            const responseBody = typeof apiError.response.body === 'string'
              ? JSON.parse(apiError.response.body)
              : apiError.response.body;
            
            // Type guard to check if responseBody has message property
            if (responseBody && typeof responseBody === 'object' && 'message' in responseBody) {
              const typedBody = responseBody as { message: string };
              errorMessage = typedBody.message;
              Logger.debug(`Extracted error message from response body: ${errorMessage}`);
            }
          } catch (parseErr) {
            // If we can't parse the body, just use the original error message
            Logger.warn('Error parsing error response body', parseErr);
          }
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
  } catch (err: unknown) {
    // Handle other errors (like connection issues)
    Logger.error(`Error getting cluster resource ${resource}/${name}: ${err instanceof Error ? err.message : String(err)}`, err);
    return {
      manifest: null,
      clusterName: activeClusterName,
      resource,
      name,
      error: `Failed to connect to Kubernetes API: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

// Cleanup on process exit
process.on('SIGINT', async () => {
  Logger.info('Received SIGINT, cleaning up...');
  const cache = await CacheFactory.getCache();
  if (cache.quit) {
    await cache.quit();
    Logger.info('Cache connection closed');
  }
  Logger.info('Exiting process.');
  process.exit(0);
});

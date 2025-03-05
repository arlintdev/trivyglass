import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  encryptKubeconfig,
  decryptKubeconfig,
  extractContextNames,
  saveCluster,
  listClusters,
  getCluster,
  deleteCluster,
  getCurrentClusterName,
  switchCluster
} from './kubeUtil';
import redis from 'redis';

// Mock redis client
vi.mock('redis', () => {
  const mockRedisClient = {
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    hSet: vi.fn().mockResolvedValue(undefined),
    hGet: vi.fn().mockResolvedValue(null),
    hDel: vi.fn().mockResolvedValue(undefined),
    sAdd: vi.fn().mockResolvedValue(undefined),
    sRem: vi.fn().mockResolvedValue(undefined),
    sMembers: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    setEx: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue([]),
    quit: vi.fn().mockResolvedValue(undefined)
  };

  return {
    default: {
      createClient: vi.fn().mockReturnValue(mockRedisClient)
    },
    createClient: vi.fn().mockReturnValue(mockRedisClient)
  };
});

// Mock crypto
vi.mock('crypto', () => {
  const cipherMock = {
    update: vi.fn().mockReturnValue('encrypted'),
    final: vi.fn().mockReturnValue('final')
  };
  
  const decipherMock = {
    update: vi.fn().mockReturnValue('decrypted'),
    final: vi.fn().mockReturnValue('final')
  };
  
  return {
    randomBytes: vi.fn().mockReturnValue(Buffer.from('0123456789abcdef')),
    createCipheriv: vi.fn().mockReturnValue(cipherMock),
    createDecipheriv: vi.fn().mockReturnValue(decipherMock)
  };
});

// Mock js-yaml
vi.mock('js-yaml', () => {
  return {
    load: vi.fn().mockImplementation((yaml) => {
      if (typeof yaml === 'string' && yaml.includes('contexts:')) {
        return {
          contexts: [
            { name: 'test-context-1' },
            { name: 'test-context-2' }
          ],
          clusters: [
            { name: 'test-cluster-1' },
            { name: 'test-cluster-2' }
          ],
          users: [
            { name: 'test-user-1' },
            { name: 'test-user-2' }
          ],
          'current-context': 'test-context-1'
        };
      }
      return {};
    }),
    dump: vi.fn().mockReturnValue('mocked yaml content')
  };
});

// Mock KubeConfig
vi.mock('@kubernetes/client-node', () => {
  const KubeConfigMock = vi.fn().mockImplementation(() => ({
    loadFromDefault: vi.fn(),
    loadFromCluster: vi.fn(),
    loadFromString: vi.fn(),
    makeApiClient: vi.fn().mockImplementation(() => ({
      listClusterCustomObject: vi.fn().mockResolvedValue({ items: [] }),
      listCustomObjectForAllNamespaces: vi.fn().mockResolvedValue({ items: [] }),
      getClusterCustomObject: vi.fn().mockResolvedValue({ spec: { versions: [] } })
    })),
    getContexts: vi.fn().mockReturnValue([]),
    getCurrentContext: vi.fn().mockReturnValue('default'),
    setCurrentContext: vi.fn()
  }));

  return {
    KubeConfig: KubeConfigMock,
    CustomObjectsApi: vi.fn()
  };
});

describe('kubeUtil', () => {
  const mockRedisClient = (redis.createClient() as unknown) as {
    hSet: ReturnType<typeof vi.fn>;
    hGet: ReturnType<typeof vi.fn>;
    hDel: ReturnType<typeof vi.fn>;
    sAdd: ReturnType<typeof vi.fn>;
    sRem: ReturnType<typeof vi.fn>;
    sMembers: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('encryptKubeconfig', () => {
    it('encrypts a kubeconfig string', () => {
      const result = encryptKubeconfig('test-kubeconfig');
      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('iv');
      expect(result.encryptedData).toBe('encryptedfinal');
      expect(result.iv).toBe('30313233343536373839616263646566');
    });
  });

  describe('decryptKubeconfig', () => {
    it('decrypts an encrypted kubeconfig', () => {
      const result = decryptKubeconfig('encrypted-data', 'iv');
      expect(result).toBe('decryptedfinal');
    });
  });

  describe('extractContextNames', () => {
    it('extracts context names from a kubeconfig', () => {
      const kubeconfig = `
apiVersion: v1
kind: Config
contexts:
- name: test-context-1
- name: test-context-2
      `;
      const result = extractContextNames(kubeconfig);
      expect(result).toEqual(['test-context-1', 'test-context-2']);
    });

    it('returns an empty array for invalid kubeconfig', () => {
      const result = extractContextNames('invalid-kubeconfig');
      expect(result).toEqual([]);
    });
  });

  describe('saveCluster', () => {
    it('saves a kubeconfig to Redis', async () => {
      // Mock extractContextNames to return valid contexts
      const extractContextNamesSpy = vi.spyOn({ extractContextNames }, 'extractContextNames');
      extractContextNamesSpy.mockReturnValue(['test-context-1', 'test-context-2']);
      
      mockRedisClient.hSet.mockResolvedValue(undefined);
      mockRedisClient.sAdd.mockResolvedValue(undefined);

      const kubeconfig = `
apiVersion: v1
kind: Config
contexts:
- name: test-context-1
  context:
    cluster: test-cluster-1
    user: test-user-1
- name: test-context-2
  context:
    cluster: test-cluster-2
    user: test-user-2
clusters:
- name: test-cluster-1
- name: test-cluster-2
users:
- name: test-user-1
- name: test-user-2
current-context: test-context-1
      `;

      const result = await saveCluster(kubeconfig);
      expect(result).toEqual(['test-context-1', 'test-context-2']);
      expect(mockRedisClient.hSet).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.sAdd).toHaveBeenCalledTimes(2);
      
      // Restore the original implementation
      extractContextNamesSpy.mockRestore();
    });

    it('throws an error if no contexts are found', async () => {
      // Mock extractContextNames to return empty array
      const extractContextNamesSpy = vi.spyOn({ extractContextNames }, 'extractContextNames');
      extractContextNamesSpy.mockReturnValue([]);
      
      const kubeconfig = 'apiVersion: v1\nkind: Config';
      await expect(saveCluster(kubeconfig)).rejects.toThrow('No valid contexts found');
      
      // Restore the original implementation
      extractContextNamesSpy.mockRestore();
    });
  });

  describe('listClusters', () => {
    it('lists all available clusters', async () => {
      mockRedisClient.sMembers.mockResolvedValue(['test-cluster-1', 'test-cluster-2']);
      mockRedisClient.hGet.mockImplementation((_, name) => {
        if (name === 'test-cluster-1') {
          return Promise.resolve(JSON.stringify({
            name: 'test-cluster-1',
            createdAt: '2025-01-01T00:00:00.000Z'
          }));
        }
        if (name === 'test-cluster-2') {
          return Promise.resolve(JSON.stringify({
            name: 'test-cluster-2',
            createdAt: '2025-01-02T00:00:00.000Z'
          }));
        }
        return Promise.resolve(null);
      });

      const result = await listClusters();
      expect(result).toHaveLength(3); // local + 2 clusters
      expect(result[0].name).toBe('local');
      expect(result[0].isLocal).toBe(true);
      expect(result[1].name).toBe('test-cluster-1');
      expect(result[2].name).toBe('test-cluster-2');
    });
  });

  describe('getCluster', () => {
    it('returns null for local cluster', async () => {
      const result = await getCluster('local');
      expect(result).toBeNull();
    });

    it('returns cluster data for non-local cluster', async () => {
      const mockClusterData = {
        name: 'test-cluster',
        encryptedData: 'encrypted-data',
        iv: 'iv',
        createdAt: '2025-01-01T00:00:00.000Z'
      };
      mockRedisClient.hGet.mockResolvedValue(JSON.stringify(mockClusterData));

      const result = await getCluster('test-cluster');
      expect(result).toEqual(mockClusterData);
    });

    it('returns null if cluster not found', async () => {
      mockRedisClient.hGet.mockResolvedValue(null);
      const result = await getCluster('non-existent-cluster');
      expect(result).toBeNull();
    });
  });

  describe('deleteCluster', () => {
    it('throws an error when trying to delete local cluster', async () => {
      await expect(deleteCluster('local')).rejects.toThrow('Cannot delete local cluster');
    });

    it('deletes a non-local cluster', async () => {
      mockRedisClient.hDel.mockResolvedValue(undefined);
      mockRedisClient.sRem.mockResolvedValue(undefined);

      await deleteCluster('test-cluster');
      expect(mockRedisClient.hDel).toHaveBeenCalledWith('kubeconfigs', 'test-cluster');
      expect(mockRedisClient.sRem).toHaveBeenCalledWith('cluster_names', 'test-cluster');
    });
  });

  describe('getCurrentClusterName', () => {
    it('returns the current active cluster name', () => {
      // The default is 'local' as initialized in the module
      const result = getCurrentClusterName();
      expect(result).toBe('local');
    });
  });

  describe('switchCluster', () => {
    it('switches to a different cluster', async () => {
      // Mock getCluster to return a valid cluster
      mockRedisClient.hGet.mockResolvedValue(JSON.stringify({
        name: 'test-cluster',
        encryptedData: 'encrypted-data',
        iv: 'iv',
        createdAt: '2025-01-01T00:00:00.000Z'
      }));
      
      mockRedisClient.del.mockResolvedValue(undefined);
      mockRedisClient.keys.mockResolvedValue([]);

      await switchCluster('test-cluster');
      expect(getCurrentClusterName()).toBe('test-cluster');
    });

    it('throws an error if cluster not found', async () => {
      mockRedisClient.hGet.mockResolvedValue(null);
      await expect(switchCluster('non-existent-cluster')).rejects.toThrow('Cluster non-existent-cluster not found');
    });
  });
});
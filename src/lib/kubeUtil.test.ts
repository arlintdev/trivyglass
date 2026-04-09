import { describe, it, expect, beforeEach, vi } from 'vitest';
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

// Mock objects defined outside vi.mock so they can be re-applied in beforeEach
const cipherMock = {
	update: vi.fn(),
	final: vi.fn()
};

const decipherMock = {
	update: vi.fn(),
	final: vi.fn()
};

const mockRedisClient = {
	on: vi.fn(),
	connect: vi.fn(),
	hSet: vi.fn(),
	hGet: vi.fn(),
	hDel: vi.fn(),
	sAdd: vi.fn(),
	sRem: vi.fn(),
	sMembers: vi.fn(),
	get: vi.fn(),
	setEx: vi.fn(),
	del: vi.fn(),
	keys: vi.fn(),
	quit: vi.fn()
};

// Mock redis client
vi.mock('redis', () => {
	return {
		default: {
			createClient: vi.fn(() => mockRedisClient)
		},
		createClient: vi.fn(() => mockRedisClient)
	};
});

// Mock crypto
vi.mock('crypto', () => {
	const cryptoImpl = {
		randomBytes: vi.fn(() => Buffer.from('0123456789abcdef')),
		createCipheriv: vi.fn(() => cipherMock),
		createDecipheriv: vi.fn(() => decipherMock)
	};

	return {
		...cryptoImpl,
		default: cryptoImpl
	};
});

// Mock js-yaml
vi.mock('js-yaml', () => {
	const yamlImpl = {
		load: vi.fn((yaml) => {
			if (typeof yaml === 'string' && yaml.includes('contexts:')) {
				return {
					contexts: [{ name: 'test-context-1' }, { name: 'test-context-2' }],
					clusters: [{ name: 'test-cluster-1' }, { name: 'test-cluster-2' }],
					users: [{ name: 'test-user-1' }, { name: 'test-user-2' }],
					'current-context': 'test-context-1'
				};
			}
			return {};
		}),
		dump: vi.fn(() => 'mocked yaml content')
	};

	return {
		...yamlImpl,
		default: yamlImpl
	};
});

// Mock KubeConfig
vi.mock('@kubernetes/client-node', () => {
	const KubeConfigMock = vi.fn(function () {
		return {
			loadFromDefault: vi.fn(),
			loadFromCluster: vi.fn(),
			loadFromString: vi.fn(),
			makeApiClient: vi.fn(() => ({
				listClusterCustomObject: vi.fn(() => Promise.resolve({ items: [] })),
				listCustomObjectForAllNamespaces: vi.fn(() => Promise.resolve({ items: [] })),
				getClusterCustomObject: vi.fn(() => Promise.resolve({ spec: { versions: [] } }))
			})),
			getContexts: vi.fn(() => []),
			getCurrentContext: vi.fn(() => 'default'),
			setCurrentContext: vi.fn()
		};
	});

	return {
		KubeConfig: KubeConfigMock,
		CustomObjectsApi: vi.fn()
	};
});

describe('kubeUtil', () => {
	beforeEach(() => {
		// Restore mock implementations after global resetAllMocks clears them
		cipherMock.update.mockReturnValue('encrypted');
		cipherMock.final.mockReturnValue('final');
		decipherMock.update.mockReturnValue('decrypted');
		decipherMock.final.mockReturnValue('final');
		mockRedisClient.on.mockReturnValue(undefined);
		mockRedisClient.connect.mockResolvedValue(undefined);
		mockRedisClient.hSet.mockResolvedValue(undefined);
		mockRedisClient.hGet.mockResolvedValue(null);
		mockRedisClient.hDel.mockResolvedValue(undefined);
		mockRedisClient.sAdd.mockResolvedValue(undefined);
		mockRedisClient.sRem.mockResolvedValue(undefined);
		mockRedisClient.sMembers.mockResolvedValue([]);
		mockRedisClient.get.mockResolvedValue(null);
		mockRedisClient.setEx.mockResolvedValue(undefined);
		mockRedisClient.del.mockResolvedValue(undefined);
		mockRedisClient.keys.mockResolvedValue([]);
		mockRedisClient.quit.mockResolvedValue(undefined);
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
					return Promise.resolve(
						JSON.stringify({
							name: 'test-cluster-1',
							createdAt: '2025-01-01T00:00:00.000Z'
						})
					);
				}
				if (name === 'test-cluster-2') {
					return Promise.resolve(
						JSON.stringify({
							name: 'test-cluster-2',
							createdAt: '2025-01-02T00:00:00.000Z'
						})
					);
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
			mockRedisClient.hGet.mockResolvedValue(
				JSON.stringify({
					name: 'test-cluster',
					encryptedData: 'encrypted-data',
					iv: 'iv',
					createdAt: '2025-01-01T00:00:00.000Z'
				})
			);

			mockRedisClient.del.mockResolvedValue(undefined);
			mockRedisClient.keys.mockResolvedValue([]);

			await switchCluster('test-cluster');
			expect(getCurrentClusterName()).toBe('test-cluster');
		});

		it('throws an error if cluster not found', async () => {
			mockRedisClient.hGet.mockResolvedValue(null);
			await expect(switchCluster('non-existent-cluster')).rejects.toThrow(
				'Cluster non-existent-cluster not found'
			);
		});
	});
});

import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

// required for svelte5 + jsdom as jsdom does not support matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	enumerable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value.toString();
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		key: vi.fn((index: number) => Object.keys(store)[index] || null),
		length: 0
	};
})();

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock
});

// Mock fetch API
global.fetch = vi.fn();

// Reset mocks between tests
beforeEach(() => {
	vi.resetAllMocks();
	localStorageMock.clear();
});

// Helper to mock fetch responses
export function mockFetchResponse<T>(data: T, status = 200) {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: vi.fn().mockResolvedValue(data),
		text: vi.fn().mockResolvedValue(JSON.stringify(data))
	};
}

// Mock Svelte onMount
vi.mock('svelte', async () => {
	const actual = await vi.importActual('svelte');
	return {
		...actual,
		onMount: vi.fn((callback) => callback())
	};
});

// Mock Redis client
vi.mock('redis', () => {
	const createClientMock = vi.fn().mockReturnValue({
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
	});

	return {
		createClient: createClientMock
	};
});

// Mock Kubernetes client
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

// Mock crypto for encryption/decryption
vi.mock('crypto', () => {
	return {
		default: {
			randomBytes: vi.fn().mockReturnValue(Buffer.from('0123456789abcdef')),
			createCipheriv: vi.fn().mockImplementation(() => ({
				update: vi.fn().mockReturnValue('encrypted'),
				final: vi.fn().mockReturnValue('final')
			})),
			createDecipheriv: vi.fn().mockImplementation(() => ({
				update: vi.fn().mockReturnValue('decrypted'),
				final: vi.fn().mockReturnValue('final')
			}))
		}
	};
});

// Mock js-yaml
vi.mock('js-yaml', () => {
	return {
		default: {
			load: vi.fn().mockImplementation((yaml) => {
				// Simple mock implementation
				if (typeof yaml === 'string' && yaml.includes('contexts:')) {
					return {
						contexts: [{ name: 'test-context' }],
						clusters: [{ name: 'test-cluster' }],
						users: [{ name: 'test-user' }],
						'current-context': 'test-context'
					};
				}
				return {};
			}),
			dump: vi.fn().mockReturnValue('mocked yaml content')
		}
	};
});

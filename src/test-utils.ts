import { render } from '@testing-library/svelte';
import { mockFetchResponse } from '../vitest-setup-client';
import type { ClusterInfo, ClusterData } from './lib/kubeUtil';
import { vi } from 'vitest';
import type { SvelteComponent } from 'svelte';

// Mock data for clusters
export const mockClusters: ClusterInfo[] = [
	{ name: 'local', isLocal: true },
	{ name: 'test-cluster-1', createdAt: '2025-01-01T00:00:00.000Z' },
	{ name: 'test-cluster-2', createdAt: '2025-01-02T00:00:00.000Z' }
];

// Mock data for cluster data
export const mockClusterData: ClusterData = {
	name: 'test-cluster-1',
	encryptedData: 'encrypted-data',
	iv: 'initialization-vector',
	createdAt: '2025-01-01T00:00:00.000Z'
};

// Mock API responses
export function mockClusterListResponse(): void {
	global.fetch = vi.fn().mockResolvedValue(
		mockFetchResponse({
			clusters: mockClusters,
			currentCluster: 'local'
		})
	);
}

export function mockClusterSaveResponse(): void {
	global.fetch = vi.fn().mockResolvedValue(
		mockFetchResponse({
			success: true,
			contexts: ['test-context-1', 'test-context-2']
		})
	);
}

export function mockClusterSwitchResponse(): void {
	global.fetch = vi.fn().mockResolvedValue(
		mockFetchResponse({
			success: true
		})
	);
}

export function mockClusterDeleteResponse(): void {
	global.fetch = vi.fn().mockResolvedValue(
		mockFetchResponse({
			success: true
		})
	);
}

export function mockApiError(status = 500, message = 'Server error'): void {
	global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ message }, status));
}

// Helper to render components with common props
export function renderComponent<Props extends Record<string, unknown>>(
	component: new (...args: unknown[]) => SvelteComponent,
	props?: Props
) {
	return render(component, { props });
}

// Mock for flowbite-svelte components
vi.mock('flowbite-svelte', async () => {
	const actual = await vi.importActual('flowbite-svelte');
	return {
		...actual,
		Modal: vi.fn().mockImplementation(({ children }) => ({
			render: () => ({ html: '<div class="modal">' + children + '</div>' })
		})),
		Button: vi.fn().mockImplementation(({ children, onclick }) => ({
			render: () => ({
				html: `<button class="button" data-testid="button">${children}</button>`,
				component: { onclick }
			})
		})),
		Alert: vi.fn().mockImplementation(({ children, color }) => ({
			render: () => ({ html: `<div class="alert alert-${color}">${children}</div>` })
		})),
		Spinner: vi.fn().mockImplementation(() => ({
			render: () => ({ html: '<div class="spinner"></div>' })
		}))
	};
});

// Mock for flowbite-svelte-icons
vi.mock('flowbite-svelte-icons', async () => {
	return {
		ServerSolid: vi.fn().mockImplementation(() => ({
			render: () => ({ html: '<svg class="server-icon"></svg>' })
		})),
		CogSolid: vi.fn().mockImplementation(() => ({
			render: () => ({ html: '<svg class="cog-icon"></svg>' })
		})),
		ArchiveSolid: vi.fn().mockImplementation(() => ({
			render: () => ({ html: '<svg class="archive-icon"></svg>' })
		}))
	};
});

// Mock for $app/stores if needed
vi.mock('$app/stores', () => {
	return {
		page: { subscribe: vi.fn() },
		navigating: { subscribe: vi.fn() },
		updated: { subscribe: vi.fn() }
	};
});

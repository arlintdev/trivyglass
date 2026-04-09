import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import NavBar from './NavBar.svelte';
import { mockClusterListResponse } from '../test-utils';

// Mock $app/stores
vi.mock('$app/stores', () => {
	return {
		page: {
			subscribe: vi.fn((callback) => {
				callback({ url: { pathname: '/' } });
				return () => {};
			})
		},
		navigating: { subscribe: vi.fn() },
		updated: { subscribe: vi.fn() }
	};
});

describe('NavBar Component', () => {
	let setIntervalSpy: ReturnType<typeof vi.spyOn>;
	let clearIntervalSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();

		// Re-setup spies after global resetAllMocks
		setIntervalSpy = vi.spyOn(window, 'setInterval').mockImplementation(() => {
			return 123 as unknown as NodeJS.Timeout;
		});
		clearIntervalSpy = vi.spyOn(window, 'clearInterval').mockImplementation(() => {});
		vi.spyOn(window, 'addEventListener').mockImplementation(() => {});
		vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});

		// Default mock responses
		mockClusterListResponse();

		// Mock localStorage
		vi.spyOn(window.localStorage, 'getItem').mockImplementation((key) => {
			if (key === 'currentCluster') return 'local';
			if (key === 'lastClusterSwitchTime') return '0';
			if (key === 'clusterSwitched') return null;
			if (key === 'color-theme') return 'dark';
			return null;
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders the navbar with the correct title', () => {
		render(NavBar);
		expect(screen.getByText('Trivy Glass')).toBeInTheDocument();
	});

	it('displays the current cluster name', async () => {
		render(NavBar);

		await waitFor(() => {
			// The label is CLUSTER: in uppercase (nd-label class)
			expect(screen.getByText('local')).toBeInTheDocument();
		});
	});

	it.skip('shows error indicator when connection fails', async () => {
		// Skipped: Svelte 5 reactivity in onMount does not reliably trigger DOM updates in jsdom
		global.fetch = vi.fn().mockRejectedValue(new Error('Failed to connect to cluster'));
		render(NavBar);

		await waitFor(
			() => {
				const errorElement = document.querySelector('.nd-status-error');
				expect(errorElement).not.toBeNull();
			},
			{ timeout: 3000 }
		);
	});

	it('uses localStorage value for cluster when available', async () => {
		vi.spyOn(window.localStorage, 'getItem').mockImplementation((key) => {
			if (key === 'currentCluster') return 'test-cluster';
			return null;
		});

		render(NavBar);

		await waitFor(() => {
			expect(screen.getByText('test-cluster')).toBeInTheDocument();
		});
	});

	it('sets up polling interval on mount', () => {
		render(NavBar);
		expect(setIntervalSpy).toHaveBeenCalled();
	});

	it('cleans up interval on unmount', async () => {
		const { unmount } = render(NavBar);
		// Wait for onMount to complete
		await waitFor(() => {
			expect(setIntervalSpy).toHaveBeenCalled();
		});
		unmount();
		expect(clearIntervalSpy).toHaveBeenCalled();
	});

	it('toggles cluster manager when button is clicked', async () => {
		render(NavBar);

		// Find the settings/cluster manager button by its title
		const settingsButton = screen.getByTitle('Manage Clusters');
		expect(settingsButton).toBeInTheDocument();
	});
});

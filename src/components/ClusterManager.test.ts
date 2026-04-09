import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ClusterManager from './ClusterManager.svelte';
import {
	mockClusterListResponse,
	mockClusterSwitchResponse,
	mockApiError,
	mockClusters
} from '../test-utils';

// Mock window.location.reload
const reloadMock = vi.fn();
Object.defineProperty(window, 'location', {
	value: {
		...window.location,
		reload: reloadMock
	},
	writable: true
});

describe('ClusterManager Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		reloadMock.mockReset();

		// Default mock responses
		mockClusterListResponse();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders the cluster manager modal', () => {
		render(ClusterManager, { props: { isOpen: true } });
		expect(screen.getByText('Manage Clusters')).toBeInTheDocument();
	});

	it('displays a list of clusters', async () => {
		render(ClusterManager, { props: { isOpen: true } });

		// Wait for the component to load clusters via onMount fetch
		await waitFor(() => {
			mockClusters.forEach((cluster) => {
				expect(screen.getByText(cluster.name)).toBeInTheDocument();
			});
		});
	});

	it('shows active status for the current cluster', async () => {
		render(ClusterManager, { props: { isOpen: true } });

		await waitFor(() => {
			expect(screen.getByText('Active')).toBeInTheDocument();
		});
	});

	it('shows error message when API call fails', async () => {
		mockApiError(500, 'Failed to load clusters');

		render(ClusterManager, { props: { isOpen: true } });

		await waitFor(() => {
			expect(screen.getByText('Failed to load clusters')).toBeInTheDocument();
		});
	});

	it('handles cluster switching', async () => {
		mockClusterListResponse();

		render(ClusterManager, { props: { isOpen: true } });

		await waitFor(() => {
			expect(screen.getAllByText('Switch').length).toBeGreaterThan(0);
		});

		// Switch to a non-active cluster
		mockClusterSwitchResponse();
		const switchButton = screen.getAllByText('Switch')[0];
		await fireEvent.click(switchButton);

		await waitFor(() => {
			expect(reloadMock).toHaveBeenCalled();
		});
	});

	it('handles cluster deletion', async () => {
		mockClusterListResponse();

		render(ClusterManager, { props: { isOpen: true } });

		await waitFor(() => {
			expect(screen.getByText('test-cluster-1')).toBeInTheDocument();
		});

		// Find and click a delete button (ArchiveSolid icon button with color="red")
		const deleteButtons = screen.getAllByTitle('Delete cluster');
		expect(deleteButtons.length).toBeGreaterThan(0);

		await fireEvent.click(deleteButtons[0]);

		// Confirm deletion dialog should appear
		await waitFor(() => {
			expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
		});

		// Mock delete then subsequent loadClusters call
		let deleteCallCount = 0;
		global.fetch = vi.fn().mockImplementation(() => {
			deleteCallCount++;
			if (deleteCallCount === 1) {
				// Delete response
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ success: true })
				});
			}
			// loadClusters after delete
			return Promise.resolve({
				ok: true,
				status: 200,
				json: () =>
					Promise.resolve({
						clusters: [{ name: 'local', isLocal: true }],
						currentCluster: 'local'
					})
			});
		});
		const confirmButton = screen.getByText('Delete');
		await fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(screen.getByText(/deleted successfully/)).toBeInTheDocument();
		});
	});

	it('handles file upload method selection', async () => {
		render(ClusterManager, { props: { isOpen: true } });

		// Check if file upload is selected by default
		const fileRadio = document.querySelector('input[value="file"]') as HTMLInputElement;
		expect(fileRadio).not.toBeNull();
		expect(fileRadio.checked).toBe(true);

		// Switch to text input method
		const textRadio = document.querySelector('input[value="text"]') as HTMLInputElement;
		await fireEvent.click(textRadio);

		// Check if text area is now visible
		await waitFor(() => {
			expect(document.querySelector('textarea')).not.toBeNull();
		});
	});

	it('validates input before upload', async () => {
		render(ClusterManager, { props: { isOpen: true } });

		// Try to upload without selecting a file
		const uploadButton = screen
			.getAllByText('Upload Kubeconfig')
			.find((el) => el.tagName === 'BUTTON' || el.closest('button'))!;
		await fireEvent.click(uploadButton);

		await waitFor(() => {
			expect(screen.getByText('Please select a kubeconfig file')).toBeInTheDocument();
		});
	});

	it('handles successful kubeconfig upload', async () => {
		// First call: onMount loadClusters, subsequent: save then loadClusters again
		let callCount = 0;
		global.fetch = vi.fn().mockImplementation(() => {
			callCount++;
			if (callCount === 1) {
				// Initial loadClusters on mount
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () =>
						Promise.resolve({
							clusters: [{ name: 'local', isLocal: true }],
							currentCluster: 'local'
						})
				});
			}
			if (callCount === 2) {
				// Save response
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () =>
						Promise.resolve({
							success: true,
							contexts: ['test-context-1', 'test-context-2']
						})
				});
			}
			// Subsequent loadClusters after save
			return Promise.resolve({
				ok: true,
				status: 200,
				json: () =>
					Promise.resolve({
						clusters: [
							{ name: 'local', isLocal: true },
							{ name: 'test-context-1' },
							{ name: 'test-context-2' }
						],
						currentCluster: 'local'
					})
			});
		});
		render(ClusterManager, { props: { isOpen: true } });

		// Switch to text input method
		const textRadio = document.querySelector('input[value="text"]') as HTMLInputElement;
		await fireEvent.click(textRadio);

		await waitFor(() => {
			expect(document.querySelector('textarea')).not.toBeNull();
		});

		// Enter kubeconfig text
		const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
		await fireEvent.input(textarea, {
			target: { value: 'apiVersion: v1\nkind: Config\ncontexts:\n- name: test-context' }
		});

		// Submit the form
		const uploadButton = screen
			.getAllByText('Upload Kubeconfig')
			.find((el) => el.tagName === 'BUTTON' || el.closest('button'))!;
		await fireEvent.click(uploadButton);

		await waitFor(() => {
			expect(screen.getByText(/Successfully added/)).toBeInTheDocument();
		});
	});
});

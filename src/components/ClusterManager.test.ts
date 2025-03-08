import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ClusterManager from './ClusterManager.svelte';
import {
	mockClusterListResponse,
	mockClusterSaveResponse,
	mockClusterSwitchResponse,
	mockClusterDeleteResponse,
	mockApiError,
	mockClusters
} from '../test-utils';

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

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
		localStorageMock.getItem.mockReset();
		localStorageMock.setItem.mockReset();
		localStorageMock.removeItem.mockReset();
		localStorageMock.clear.mockReset();
		reloadMock.mockReset();

		// Default mock responses
		mockClusterListResponse();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('renders the cluster manager modal', () => {
		render(ClusterManager, { props: { toggleOpen: vi.fn() } });
		expect(document.querySelector('.cluster-manager-modal')).not.toBeNull();
	});

	it('displays a list of clusters', async () => {
		render(ClusterManager, { props: { toggleOpen: vi.fn() } });

		// Wait for the component to load clusters
		await vi.runAllTimersAsync();

		// Check if all clusters from the mock data are displayed
		mockClusters.forEach((cluster) => {
			expect(screen.getByText(cluster.name)).toBeInTheDocument();
		});
	});

	it('shows active status for the current cluster', async () => {
		// Mock the API to return 'local' as the current cluster
		mockClusterListResponse();

		render(ClusterManager, { props: { toggleOpen: vi.fn() } });
		await vi.runAllTimersAsync();

		// Check if the 'Active' label is shown for the local cluster
		expect(screen.getByText('Active')).toBeInTheDocument();
	});

	it('shows error message when API call fails', async () => {
		mockApiError(500, 'Failed to load clusters');

		render(ClusterManager, { props: { toggleOpen: vi.fn() } });
		await vi.runAllTimersAsync();

		expect(screen.getByText('Failed to load clusters')).toBeInTheDocument();
	});

	it('handles cluster switching', async () => {
		mockClusterListResponse();
		mockClusterSwitchResponse();

		render(ClusterManager, { props: { toggleOpen: vi.fn() } });
		await vi.runAllTimersAsync();

		// Find the switch button for a non-active cluster
		const switchButton = screen.getAllByText('Switch')[0];
		await fireEvent.click(switchButton);

		// Check if localStorage was updated
		expect(localStorageMock.setItem).toHaveBeenCalledWith('clusterSwitched', 'true');
		expect(localStorageMock.setItem).toHaveBeenCalledWith('currentCluster', expect.any(String));

		// Check if page reload was triggered
		expect(reloadMock).toHaveBeenCalled();
	});

	it('handles cluster deletion', async () => {
		mockClusterListResponse();
		mockClusterDeleteResponse();

		render(ClusterManager, { props: { toggleOpen: vi.fn() } });
		await vi.runAllTimersAsync();

		// Find the delete button for a non-local cluster
		const deleteButtons = document.querySelectorAll('.p-1');
		const deleteButton = Array.from(deleteButtons).find((button) =>
			button.querySelector('.cog-icon')
		);

		if (deleteButton) {
			await fireEvent.click(deleteButton);

			// Check if success message is shown
			expect(screen.getByText(/deleted successfully/)).toBeInTheDocument();
		} else {
			// If no delete button is found, the test should fail
			expect(deleteButton).not.toBeUndefined();
		}
	});

	it('handles file upload method selection', async () => {
		render(ClusterManager, { props: { toggleOpen: vi.fn() } });

		// Check if file upload is selected by default
		const fileRadio = document.querySelector('input[value="file"]') as HTMLInputElement;
		expect(fileRadio.checked).toBe(true);

		// Switch to text input method
		const textRadio = document.querySelector('input[value="text"]') as HTMLInputElement;
		await fireEvent.click(textRadio);

		// Check if text area is now visible
		expect(document.querySelector('textarea')).not.toBeNull();
	});

	it('validates input before upload', async () => {
		render(ClusterManager, { props: { toggleOpen: vi.fn() } });

		// Try to upload without selecting a file
		const uploadButton = screen.getByText('Upload Kubeconfig');
		await fireEvent.click(uploadButton);

		// Check if error message is shown
		expect(screen.getByText('Please select a kubeconfig file')).toBeInTheDocument();
	});

	it('handles successful kubeconfig upload', async () => {
		mockClusterSaveResponse();
		render(ClusterManager, { props: { toggleOpen: vi.fn() } });

		// Switch to text input method
		const textRadio = document.querySelector('input[value="text"]') as HTMLInputElement;
		await fireEvent.click(textRadio);

		// Enter kubeconfig text
		const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
		await fireEvent.input(textarea, {
			target: { value: 'apiVersion: v1\nkind: Config\ncontexts:\n- name: test-context' }
		});

		// Submit the form
		const uploadButton = screen.getByText('Upload Kubeconfig');
		await fireEvent.click(uploadButton);

		// Check if success message is shown
		expect(screen.getByText(/Successfully added/)).toBeInTheDocument();
	});
});

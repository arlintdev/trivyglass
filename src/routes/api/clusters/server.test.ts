import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GET, POST } from './+server';
import * as kubeUtil from '../../../lib/kubeUtil';

// Mock the kubeUtil module
vi.mock('../../../lib/kubeUtil', () => {
	return {
		listClusters: vi.fn(),
		saveCluster: vi.fn(),
		getCurrentClusterName: vi.fn()
	};
});

// Mock SvelteKit's json function
vi.mock('@sveltejs/kit', () => {
	return {
		json: vi.fn((data, options) => {
			return { body: data, status: options?.status || 200 };
		})
	};
});

describe('Clusters API Endpoints', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('GET endpoint', () => {
		it('returns clusters and current cluster name', async () => {
			const mockClusters = [
				{ name: 'local', isLocal: true },
				{ name: 'test-cluster', createdAt: '2025-01-01T00:00:00.000Z' }
			];

			vi.mocked(kubeUtil.listClusters).mockResolvedValue(mockClusters);
			vi.mocked(kubeUtil.getCurrentClusterName).mockReturnValue('local');

			const response = await GET();

			expect(kubeUtil.listClusters).toHaveBeenCalled();
			expect(kubeUtil.getCurrentClusterName).toHaveBeenCalled();
			expect(response.body).toEqual({
				clusters: mockClusters,
				currentCluster: 'local'
			});
			expect(response.status).toBe(200);
		});

		it('handles errors', async () => {
			vi.mocked(kubeUtil.listClusters).mockRejectedValue(new Error('Test error'));

			const response = await GET();

			expect(response.body).toEqual({
				error: 'Test error'
			});
			expect(response.status).toBe(500);
		});
	});

	describe('POST endpoint', () => {
		it('saves a kubeconfig', async () => {
			const mockRequest = {
				request: {
					json: vi.fn().mockResolvedValue({
						kubeconfig: 'test-kubeconfig'
					})
				}
			};

			const mockContexts = ['test-context-1', 'test-context-2'];
			vi.mocked(kubeUtil.saveCluster).mockResolvedValue(mockContexts);

			const response = await POST(mockRequest);

			expect(kubeUtil.saveCluster).toHaveBeenCalledWith('test-kubeconfig');
			expect(response.body).toEqual({
				success: true,
				contexts: mockContexts
			});
			expect(response.status).toBe(200);
		});

		it('returns 400 if kubeconfig is missing', async () => {
			const mockRequest = {
				request: {
					json: vi.fn().mockResolvedValue({})
				}
			};

			const response = await POST(mockRequest);

			expect(response.body).toEqual({
				message: 'Kubeconfig is required'
			});
			expect(response.status).toBe(400);
		});

		it('handles errors', async () => {
			const mockRequest = {
				request: {
					json: vi.fn().mockResolvedValue({
						kubeconfig: 'test-kubeconfig'
					})
				}
			};

			vi.mocked(kubeUtil.saveCluster).mockRejectedValue(new Error('Test error'));

			const response = await POST(mockRequest);

			expect(response.body).toEqual({
				message: 'Test error'
			});
			expect(response.status).toBe(500);
		});
	});
});

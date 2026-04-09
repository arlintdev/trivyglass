import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock kubeUtil before importing the module under test
vi.mock('$lib/kubeUtil', () => ({
	loadReports: vi.fn(),
	getCurrentClusterName: vi.fn().mockReturnValue('test-cluster')
}));

import { loadReports, getCurrentClusterName } from '$lib/kubeUtil';

// We test the aggregation logic by importing and calling load() directly
// Since SvelteKit page server loads are just functions, we can test them

describe('+page.server aggregation logic', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('sums vulnerability counts from both scopes', async () => {
		const mockLoadReports = vi.mocked(loadReports);
		mockLoadReports.mockImplementation(async (crd: string) => {
			if (crd === 'clustervulnerabilityreports') {
				return {
					manifests: [
						{ metadata: { name: 'cluster-1' }, Critical: 3, High: 5, Medium: 10, Low: 2 }
					],
					clusterName: 'test-cluster',
					scope: 'Cluster',
					resource: crd
				};
			}
			if (crd === 'vulnerabilityreports') {
				return {
					manifests: [
						{ metadata: { name: 'pod-1', namespace: 'default' }, Critical: 7, High: 15, Medium: 20, Low: 8 },
						{ metadata: { name: 'pod-2', namespace: 'kube-system' }, Critical: 1, High: 2, Medium: 3, Low: 4 }
					],
					clusterName: 'test-cluster',
					scope: 'Namespaced',
					resource: crd
				};
			}
			return { manifests: [], clusterName: 'test-cluster', scope: 'Unknown', resource: crd };
		});

		// Import the load function dynamically so mocks are in place
		const { load } = await import('./+page.server');
		const result = await load({} as never);

		// Cluster (3+7+1=11 critical, 5+15+2=22 high, etc.)
		expect(result.vulnerabilities.critical).toBe(11);
		expect(result.vulnerabilities.high).toBe(22);
		expect(result.vulnerabilities.medium).toBe(33);
		expect(result.vulnerabilities.low).toBe(14);
	});

	it('computes compliance score as pass percentage', async () => {
		const mockLoadReports = vi.mocked(loadReports);
		mockLoadReports.mockImplementation(async (crd: string) => {
			if (crd === 'clustercompliancereports') {
				return {
					manifests: [
						{ metadata: { name: 'comp-1' }, Pass: 80, Fail: 20 }
					],
					clusterName: 'test-cluster',
					scope: 'Cluster',
					resource: crd
				};
			}
			return { manifests: [], clusterName: 'test-cluster', scope: 'Unknown', resource: crd };
		});

		const { load } = await import('./+page.server');
		const result = await load({} as never);

		expect(result.compliance.pass).toBe(80);
		expect(result.compliance.fail).toBe(20);
		expect(result.compliance.score).toBe(80); // 80/(80+20)*100
	});

	it('returns null compliance score when no data', async () => {
		const mockLoadReports = vi.mocked(loadReports);
		mockLoadReports.mockResolvedValue({
			manifests: [],
			clusterName: 'test-cluster',
			scope: 'Unknown',
			resource: 'test'
		});

		const { load } = await import('./+page.server');
		const result = await load({} as never);

		expect(result.compliance.score).toBeNull();
	});

	it('sorts top vulnerable workloads by critical+high desc', async () => {
		const mockLoadReports = vi.mocked(loadReports);
		mockLoadReports.mockImplementation(async (crd: string) => {
			if (crd === 'vulnerabilityreports') {
				return {
					manifests: [
						{ metadata: { name: 'low-risk', namespace: 'ns1' }, Critical: 0, High: 1, Medium: 5, Low: 10 },
						{ metadata: { name: 'high-risk', namespace: 'ns2' }, Critical: 10, High: 20, Medium: 5, Low: 2 },
						{ metadata: { name: 'mid-risk', namespace: 'ns1' }, Critical: 3, High: 5, Medium: 8, Low: 3 }
					],
					clusterName: 'test-cluster',
					scope: 'Namespaced',
					resource: crd
				};
			}
			return { manifests: [], clusterName: 'test-cluster', scope: 'Unknown', resource: crd };
		});

		const { load } = await import('./+page.server');
		const result = await load({} as never);

		expect(result.topVulnerableWorkloads[0].name).toBe('high-risk');
		expect(result.topVulnerableWorkloads[1].name).toBe('mid-risk');
		expect(result.topVulnerableWorkloads[2].name).toBe('low-risk');
	});

	it('limits top vulnerable workloads to 10', async () => {
		const mockLoadReports = vi.mocked(loadReports);
		const manifests = Array.from({ length: 15 }, (_, i) => ({
			metadata: { name: `pod-${i}`, namespace: 'default' },
			Critical: 15 - i,
			High: 10,
			Medium: 5,
			Low: 1
		}));
		mockLoadReports.mockImplementation(async (crd: string) => {
			if (crd === 'vulnerabilityreports') {
				return { manifests, clusterName: 'test-cluster', scope: 'Namespaced', resource: crd };
			}
			return { manifests: [], clusterName: 'test-cluster', scope: 'Unknown', resource: crd };
		});

		const { load } = await import('./+page.server');
		const result = await load({} as never);

		expect(result.topVulnerableWorkloads).toHaveLength(10);
	});

	it('sums exposed secrets severity counts', async () => {
		const mockLoadReports = vi.mocked(loadReports);
		mockLoadReports.mockImplementation(async (crd: string) => {
			if (crd === 'exposedsecretreports') {
				return {
					manifests: [
						{ metadata: { name: 's1', namespace: 'default' }, Critical: 2, High: 3, Medium: 1, Low: 0 },
						{ metadata: { name: 's2', namespace: 'default' }, Critical: 0, High: 0, Medium: 0, Low: 0 }
					],
					clusterName: 'test-cluster',
					scope: 'Namespaced',
					resource: crd
				};
			}
			return { manifests: [], clusterName: 'test-cluster', scope: 'Unknown', resource: crd };
		});

		const { load } = await import('./+page.server');
		const result = await load({} as never);

		expect(result.secrets.critical).toBe(2);
		expect(result.secrets.high).toBe(3);
		expect(result.secrets.medium).toBe(1);
		expect(result.secrets.low).toBe(0);
		expect(result.secretsTotal).toBe(6);
	});

	it('counts reports per type', async () => {
		const mockLoadReports = vi.mocked(loadReports);
		mockLoadReports.mockImplementation(async (crd: string) => {
			if (crd === 'clustervulnerabilityreports') {
				return {
					manifests: [{ metadata: { name: 'a' } }],
					clusterName: 'test-cluster',
					scope: 'Cluster',
					resource: crd
				};
			}
			if (crd === 'vulnerabilityreports') {
				return {
					manifests: [{ metadata: { name: 'b' } }, { metadata: { name: 'c' } }],
					clusterName: 'test-cluster',
					scope: 'Namespaced',
					resource: crd
				};
			}
			return { manifests: [], clusterName: 'test-cluster', scope: 'Unknown', resource: crd };
		});

		const { load } = await import('./+page.server');
		const result = await load({} as never);

		expect(result.reportCounts.vulnerabilities).toBe(3); // 1 cluster + 2 namespace
	});

	it('handles loadReports failures gracefully', async () => {
		const mockLoadReports = vi.mocked(loadReports);
		mockLoadReports.mockRejectedValue(new Error('connection failed'));

		const { load } = await import('./+page.server');
		const result = await load({} as never);

		// Should still return valid structure with zeros
		expect(result.vulnerabilities.critical).toBe(0);
		expect(result.vulnerabilities.high).toBe(0);
		expect(result.reportCounts).toBeDefined();
		expect(result.secretsTotal).toBe(0);
		expect(result.topVulnerableWorkloads).toHaveLength(0);
	});
});

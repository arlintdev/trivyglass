import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

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

describe('Main Page Component', () => {
	const mockData = {
		vulnerabilities: { critical: 5, high: 10, medium: 20, low: 30 },
		configAudit: { pass: 100, fail: 10 },
		compliance: { pass: 50, fail: 5, score: 91 },
		secrets: { critical: 1, high: 1, medium: 1, low: 0 },
		secretsTotal: 3,
		topVulnerableWorkloads: [],
		reportCounts: {},
		clusterName: 'test-cluster'
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the dashboard with security posture', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByText('SECURITY POSTURE')).toBeInTheDocument();
	});
});

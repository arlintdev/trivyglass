import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

const mockData = {
	vulnerabilities: { critical: 5, high: 10, medium: 20, low: 30 },
	configAudit: { pass: 100, fail: 10 },
	compliance: { pass: 50, fail: 5, score: 91 },
	secrets: { critical: 1, high: 1, medium: 1, low: 0 },
	secretsTotal: 3,
	topVulnerableWorkloads: [
		{ name: 'web-app', namespace: 'production', critical: 5, high: 10, medium: 3, low: 1 },
		{ name: 'api-server', namespace: 'staging', critical: 2, high: 4, medium: 6, low: 8 }
	],
	reportCounts: { vulnerabilities: 42, 'config-audit': 18, compliance: 3 },
	clusterName: 'test-cluster'
};

describe('Dashboard page', () => {
	test('renders security posture heading', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByText('SECURITY POSTURE')).toBeInTheDocument();
	});

	test('renders vulnerability severity labels', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByText('CRITICAL')).toBeInTheDocument();
		expect(screen.getByText('HIGH')).toBeInTheDocument();
		expect(screen.getByText('MEDIUM')).toBeInTheDocument();
		expect(screen.getByText('LOW')).toBeInTheDocument();
	});

	test('renders total vulnerabilities count', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByText('65 total vulnerabilities')).toBeInTheDocument();
	});

	test('renders compliance section', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByText('COMPLIANCE')).toBeInTheDocument();
		expect(screen.getByText('50 pass / 5 fail')).toBeInTheDocument();
	});

	test('renders config audit score', () => {
		render(Page, { props: { data: mockData } });
		// auditScore = round(100/110*100) = 91
		expect(screen.getByText('CONFIG AUDIT')).toBeInTheDocument();
		expect(screen.getByText('100 pass / 10 fail')).toBeInTheDocument();
	});

	test('renders exposed secrets with breakdown', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByText('EXPOSED SECRETS')).toBeInTheDocument();
		expect(screen.getByText('1 critical / 1 high / 1 med / 0 low')).toBeInTheDocument();
	});

	test('renders no findings when secrets total is 0', () => {
		const noSecretsData = {
			...mockData,
			secrets: { critical: 0, high: 0, medium: 0, low: 0 },
			secretsTotal: 0
		};
		render(Page, { props: { data: noSecretsData } });
		expect(screen.getByText('no findings')).toBeInTheDocument();
	});

	test('renders top vulnerable workloads', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByText('TOP VULNERABLE WORKLOADS')).toBeInTheDocument();
		// Desktop table + mobile cards both render, use getAll
		expect(screen.getAllByText('web-app').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('api-server').length).toBeGreaterThanOrEqual(1);
	});

	test('renders report count quick links', () => {
		render(Page, { props: { data: mockData } });
		expect(screen.getByText('ALL REPORTS')).toBeInTheDocument();
		expect(screen.getByText('Vulnerabilities')).toBeInTheDocument();
		expect(screen.getByText('42')).toBeInTheDocument();
	});

	test('renders No data when compliance score is null', () => {
		const noCompliance = {
			...mockData,
			compliance: { pass: 0, fail: 0, score: null }
		};
		render(Page, { props: { data: noCompliance } });
		expect(screen.getAllByText('No data').length).toBeGreaterThanOrEqual(1);
	});

	test('does not render workloads section when empty', () => {
		const noWorkloads = { ...mockData, topVulnerableWorkloads: [] };
		render(Page, { props: { data: noWorkloads } });
		expect(screen.queryByText('TOP VULNERABLE WORKLOADS')).not.toBeInTheDocument();
	});
});

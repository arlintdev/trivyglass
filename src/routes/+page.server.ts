import type { PageServerLoad } from './$types';
import { loadReports, getCurrentClusterName } from '$lib/kubeUtil';
import { REPORT_TYPES } from '$lib/reportTypes';

interface SeverityCounts {
	critical: number;
	high: number;
	medium: number;
	low: number;
}

interface VulnerableWorkload {
	name: string;
	namespace: string;
	critical: number;
	high: number;
	medium: number;
	low: number;
}

function sumField(manifests: Record<string, unknown>[], field: string): number {
	return manifests.reduce((sum, m) => {
		const val = m[field];
		return sum + (typeof val === 'number' ? val : 0);
	}, 0);
}

export const load: PageServerLoad = async () => {
	const crdFetches: Record<string, Promise<{ manifests: unknown[]; error?: string } | null>> = {};

	// Fetch reports for all types that have data we want to aggregate
	for (const [slug, config] of Object.entries(REPORT_TYPES)) {
		if (config.cluster) {
			crdFetches[`${slug}_cluster`] = loadReports(config.cluster).catch(() => null);
		}
		if (config.namespace) {
			crdFetches[`${slug}_namespace`] = loadReports(config.namespace).catch(() => null);
		}
	}

	const keys = Object.keys(crdFetches);
	const results = await Promise.allSettled(Object.values(crdFetches));

	const data: Record<string, Record<string, unknown>[]> = {};
	for (let i = 0; i < keys.length; i++) {
		const result = results[i];
		if (result.status === 'fulfilled' && result.value) {
			data[keys[i]] = (result.value.manifests ?? []) as Record<string, unknown>[];
		} else {
			data[keys[i]] = [];
		}
	}

	// Aggregate vulnerability counts
	const vulnManifests = [
		...(data['vulnerabilities_cluster'] ?? []),
		...(data['vulnerabilities_namespace'] ?? [])
	];
	const vulnerabilities: SeverityCounts = {
		critical: sumField(vulnManifests, 'Critical'),
		high: sumField(vulnManifests, 'High'),
		medium: sumField(vulnManifests, 'Medium'),
		low: sumField(vulnManifests, 'Low')
	};

	// Config audit counts
	const auditManifests = [
		...(data['config-audit_cluster'] ?? []),
		...(data['config-audit_namespace'] ?? [])
	];
	const configAudit = {
		pass: sumField(auditManifests, 'Pass'),
		fail: sumField(auditManifests, 'Fail')
	};

	// Compliance - cluster only
	const complianceManifests = data['compliance_cluster'] ?? [];
	const compliance = {
		pass: sumField(complianceManifests, 'Pass'),
		fail: sumField(complianceManifests, 'Fail')
	};
	const complianceTotal = compliance.pass + compliance.fail;
	const complianceScore =
		complianceTotal > 0 ? Math.round((compliance.pass / complianceTotal) * 100) : null;

	// Exposed secrets - namespace only
	const secretsManifests = data['secrets_namespace'] ?? [];
	const secrets: SeverityCounts = {
		critical: sumField(secretsManifests, 'Critical'),
		high: sumField(secretsManifests, 'High'),
		medium: sumField(secretsManifests, 'Medium'),
		low: sumField(secretsManifests, 'Low')
	};
	const secretsTotal = secrets.critical + secrets.high + secrets.medium + secrets.low;

	// Top vulnerable workloads (from namespace vuln reports, which are per-workload)
	const nsVulnManifests = data['vulnerabilities_namespace'] ?? [];
	const topVulnerableWorkloads: VulnerableWorkload[] = nsVulnManifests
		.map((m) => {
			const meta = m.metadata as { name?: string; namespace?: string } | undefined;
			return {
				name: meta?.name ?? 'unknown',
				namespace: meta?.namespace ?? 'unknown',
				critical: typeof m.Critical === 'number' ? m.Critical : 0,
				high: typeof m.High === 'number' ? m.High : 0,
				medium: typeof m.Medium === 'number' ? m.Medium : 0,
				low: typeof m.Low === 'number' ? m.Low : 0
			};
		})
		.sort((a, b) => b.critical + b.high - (a.critical + a.high))
		.slice(0, 10);

	// Report counts per type
	const reportCounts: Record<string, number> = {};
	for (const [slug, config] of Object.entries(REPORT_TYPES)) {
		let count = 0;
		if (config.cluster) count += (data[`${slug}_cluster`] ?? []).length;
		if (config.namespace) count += (data[`${slug}_namespace`] ?? []).length;
		reportCounts[slug] = count;
	}

	return {
		vulnerabilities,
		configAudit,
		compliance: { ...compliance, score: complianceScore },
		secrets,
		secretsTotal,
		topVulnerableWorkloads,
		reportCounts,
		clusterName: getCurrentClusterName()
	};
};

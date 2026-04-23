import { listConfigMapsByLabel, ATTESTATIONS_NAMESPACE } from './kubeUtil';

export type KubeBenchStatus = 'PASS' | 'FAIL' | 'WARN' | 'INFO';

export interface KubeBenchResult {
	status: KubeBenchStatus;
	testDesc: string;
	audit: string;
	remediation: string;
	actualValue: string;
	benchmark: string;
	section: string;
}

export type KubeBenchMap = Record<string, KubeBenchResult>;

export interface KubeBenchSummary {
	benchmark: string;
	scannedAt: string;
	totals: { pass: number; fail: number; warn: number; info: number };
	results: KubeBenchMap;
}

interface RawResult {
	test_number?: string;
	test_desc?: string;
	status?: string;
	audit?: string;
	remediation?: string;
	actual_value?: string;
}

interface RawTest {
	section?: string;
	results?: RawResult[];
}

interface RawControl {
	version?: string;
	tests?: RawTest[];
}

interface RawReport {
	Controls?: RawControl[];
	Totals?: Record<string, number>;
}

const V_ID = /V-\d{5,}/;

function isStatus(s: unknown): s is KubeBenchStatus {
	return s === 'PASS' || s === 'FAIL' || s === 'WARN' || s === 'INFO';
}

function parseReport(raw: unknown, benchmarkLabel: string): KubeBenchSummary | null {
	if (!raw || typeof raw !== 'object') return null;
	const report = raw as RawReport;
	const controls = Array.isArray(report.Controls) ? report.Controls : [];
	if (controls.length === 0) return null;

	const results: KubeBenchMap = {};
	let pass = 0;
	let fail = 0;
	let warn = 0;
	let info = 0;
	const benchmark = controls[0]?.version ?? benchmarkLabel;

	for (const ctrl of controls) {
		for (const test of ctrl.tests ?? []) {
			for (const r of test.results ?? []) {
				// kube-bench's EKS STIG profile inconsistently places DISA V-IDs
				// across fields: sometimes `test_number` is "V-242XXX", sometimes
				// it's a CIS-style section like "3.2.7" and the V-ID is only in
				// `test_desc`. Scan every string field for the V-ID pattern and
				// take the first match — misses are filtered out anyway.
				if (!isStatus(r.status)) continue;
				const haystack = [r.test_number, r.test_desc, r.audit, r.remediation]
					.filter((s): s is string => typeof s === 'string')
					.join(' ');
				const match = haystack.match(V_ID);
				if (!match) continue;
				const vId = match[0];
				// First write wins — don't overwrite a FAIL with a WARN that
				// happens to appear later for the same V-ID in another section.
				if (results[vId]) continue;
				results[vId] = {
					status: r.status,
					testDesc: r.test_desc ?? '',
					audit: r.audit ?? '',
					remediation: r.remediation ?? '',
					actualValue: r.actual_value ?? '',
					benchmark,
					section: test.section ?? ''
				};
				if (r.status === 'PASS') pass++;
				else if (r.status === 'FAIL') fail++;
				else if (r.status === 'WARN') warn++;
				else info++;
			}
		}
	}

	return {
		benchmark,
		scannedAt: '',
		totals: { pass, fail, warn, info },
		results
	};
}

/**
 * Read every kube-bench ConfigMap (`trivyglass-kubebench-*`) in the
 * attestations namespace and merge their results. One ConfigMap per
 * benchmark — an operator running both EKS STIG and CIS profiles gets
 * both summaries back; per-V-ID, first non-empty wins within a summary,
 * but across summaries the caller's merge policy decides precedence.
 */
export async function getKubeBenchResults(): Promise<KubeBenchSummary[]> {
	const cms = await listConfigMapsByLabel(
		ATTESTATIONS_NAMESPACE,
		'trivyglass.io/source=kube-bench'
	);
	const summaries: KubeBenchSummary[] = [];
	for (const cm of cms) {
		if (!cm.name.startsWith('trivyglass-kubebench-')) continue;
		const raw = cm.data['results.json'];
		if (!raw) continue;
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			continue;
		}
		const benchmarkLabel =
			cm.labels['trivyglass.io/benchmark'] ??
			cm.name.replace(/^trivyglass-kubebench-/, '') ??
			'unknown';
		const summary = parseReport(parsed, benchmarkLabel);
		if (!summary) continue;
		summary.scannedAt = cm.creationTimestamp;
		summaries.push(summary);
	}
	return summaries;
}

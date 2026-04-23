import type { PageServerLoad } from './$types';
import { dev } from '$app/environment';
import {
	getClusterResource,
	getCurrentClusterName,
	getAttestations,
	ATTESTATIONS_NAMESPACE,
	type AttestationMap
} from '$lib/kubeUtil';
import { getKubeBenchResults, type KubeBenchSummary } from '$lib/kubebench.server';
import { REPORT_TYPES } from '$lib/reportTypes';
import { stigById, stigSource } from '$lib/stig/stigCatalog.server';
import { error } from '@sveltejs/kit';

export const csr = dev;
export const prerender = false;

interface DriftEntry {
	id: string;
	title: string;
	cat: string;
}

function computeDrift(manifest: unknown): {
	missingFromSpec: DriftEntry[];
	extraInSpec: string[];
} {
	const m = manifest as { spec?: { compliance?: { controls?: { id: string }[] } } } | null;
	const specIds = new Set<string>();
	for (const c of m?.spec?.compliance?.controls ?? []) {
		if (c?.id) specIds.add(c.id);
	}
	const missingFromSpec: DriftEntry[] = [];
	for (const [id, entry] of stigById) {
		if (!specIds.has(id)) {
			missingFromSpec.push({ id, title: entry.ruleTitle, cat: entry.cat });
		}
	}
	missingFromSpec.sort((a, b) => a.id.localeCompare(b.id));
	const extraInSpec: string[] = [];
	for (const id of specIds) {
		if (!stigById.has(id)) extraInSpec.push(id);
	}
	extraInSpec.sort();
	return { missingFromSpec, extraInSpec };
}

export const load: PageServerLoad = async ({ params }) => {
	const { reportType, name } = params;
	const config = REPORT_TYPES[reportType];

	if (!config?.cluster) {
		throw error(404, `No cluster-scoped reports for: ${reportType}`);
	}

	const resource = config.cluster;

	try {
		const result = await getClusterResource(resource, name);

		if (resource !== 'clustercompliancereports') {
			return result;
		}

		// Compliance reports carry three extra server-side enrichments:
		// attestations (manual ConfigMap) override Not_Reviewed controls,
		// kube-bench results (automated ConfigMap) override Not_Reviewed and
		// outrank attestations, and STIG drift compares the spec's control
		// list against the bundled DISA catalog. All are additive — a missing
		// ConfigMap is normal and must not break the report render.
		const [attestationsSettled, kubebenchSettled] = await Promise.allSettled([
			getAttestations(name),
			getKubeBenchResults()
		]);

		let attestations: AttestationMap = {};
		let attestationError: string | undefined;
		if (attestationsSettled.status === 'fulfilled') {
			attestations = attestationsSettled.value;
		} else {
			attestationError =
				attestationsSettled.reason instanceof Error
					? attestationsSettled.reason.message
					: String(attestationsSettled.reason);
			console.error(`Attestation load failed for ${name}: ${attestationError}`);
		}

		let kubebench: KubeBenchSummary[] = [];
		let kubebenchError: string | undefined;
		if (kubebenchSettled.status === 'fulfilled') {
			kubebench = kubebenchSettled.value;
		} else {
			kubebenchError =
				kubebenchSettled.reason instanceof Error
					? kubebenchSettled.reason.message
					: String(kubebenchSettled.reason);
			console.error(`kube-bench load failed for ${name}: ${kubebenchError}`);
		}

		const drift = computeDrift(result.manifest);

		return {
			...result,
			attestations,
			attestationNamespace: ATTESTATIONS_NAMESPACE,
			attestationError,
			kubebench,
			kubebenchError,
			stig: {
				source: stigSource,
				drift
			}
		};
	} catch (err: unknown) {
		if (err instanceof Error) {
			console.error(`Error in page server load: ${err.message}`);
			return {
				manifest: null,
				error: err.message,
				clusterName: getCurrentClusterName(),
				resource,
				name
			};
		}
		console.error(`Error in page server load: ${String(err)}`);
		return {
			manifest: null,
			error: 'An unknown error occurred',
			clusterName: getCurrentClusterName(),
			resource,
			name
		};
	}
};

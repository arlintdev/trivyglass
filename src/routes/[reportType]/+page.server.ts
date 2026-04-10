import type { PageServerLoad } from './$types';
import { loadReports } from '$lib/kubeUtil';
import { REPORT_TYPES } from '$lib/reportTypes';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { reportType } = params;
	const config = REPORT_TYPES[reportType];

	if (!config) {
		throw error(404, `Unknown report type: ${reportType}`);
	}

	const results = await Promise.allSettled([
		config.cluster ? loadReports(config.cluster) : Promise.resolve(null),
		config.namespace ? loadReports(config.namespace) : Promise.resolve(null)
	]);

	const clusterResult = results[0].status === 'fulfilled' ? results[0].value : null;
	const namespaceResult = results[1].status === 'fulfilled' ? results[1].value : null;

	// Tag each manifest with scope and CRD plural for downstream use
	const clusterManifests = ((clusterResult?.manifests ?? []) as Record<string, unknown>[]).map(
		(m) => ({
			...m,
			_scope: 'cluster' as const,
			_crdPlural: config.cluster
		})
	);
	const namespaceManifests = ((namespaceResult?.manifests ?? []) as Record<string, unknown>[]).map(
		(m) => ({
			...m,
			_scope: 'namespace' as const,
			_crdPlural: config.namespace
		})
	);

	const manifests = [...clusterManifests, ...namespaceManifests];
	const clusterName = clusterResult?.clusterName ?? namespaceResult?.clusterName ?? '';

	const errors: string[] = [];
	if (results[0].status === 'rejected') errors.push(String(results[0].reason));
	if (results[1].status === 'rejected') errors.push(String(results[1].reason));
	if (clusterResult?.error) errors.push(clusterResult.error);
	if (namespaceResult?.error) errors.push(namespaceResult.error);

	return {
		manifests,
		clusterName,
		resource: reportType,
		label: config.label,
		hasCluster: !!config.cluster,
		hasNamespace: !!config.namespace,
		error: errors.length > 0 ? errors.join('; ') : undefined
	};
};

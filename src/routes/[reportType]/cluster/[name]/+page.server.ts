import type { PageServerLoad } from './$types';
import { dev } from '$app/environment';
import { getClusterResource, getCurrentClusterName } from '$lib/kubeUtil';
import { REPORT_TYPES } from '$lib/reportTypes';
import { error } from '@sveltejs/kit';

export const csr = dev;
export const prerender = false;

export const load: PageServerLoad = async ({ params }) => {
	const { reportType, name } = params;
	const config = REPORT_TYPES[reportType];

	if (!config?.cluster) {
		throw error(404, `No cluster-scoped reports for: ${reportType}`);
	}

	const resource = config.cluster;

	try {
		const result = await getClusterResource(resource, name);
		return result;
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

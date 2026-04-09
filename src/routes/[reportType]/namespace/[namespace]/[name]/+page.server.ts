import type { PageServerLoad } from './$types';
import { dev } from '$app/environment';
import { getNamespacedResource, getCurrentClusterName } from '$lib/kubeUtil';
import { REPORT_TYPES } from '$lib/reportTypes';
import { error } from '@sveltejs/kit';

export const csr = dev;
export const prerender = false;

export const load: PageServerLoad = async ({ params }) => {
	const { reportType, namespace, name } = params;
	const config = REPORT_TYPES[reportType];

	if (!config?.namespace) {
		throw error(404, `No namespace-scoped reports for: ${reportType}`);
	}

	const resource = config.namespace;

	try {
		const result = await getNamespacedResource(resource, namespace, name);
		return result;
	} catch (err: unknown) {
		if (err instanceof Error) {
			console.error(`Error in page server load: ${err.message}`);
			return {
				manifest: null,
				error: err.message,
				clusterName: getCurrentClusterName(),
				namespace,
				resource,
				name
			};
		}
		console.error(`Error in page server load: ${String(err)}`);
		return {
			manifest: null,
			error: 'An unknown error occurred',
			clusterName: getCurrentClusterName(),
			namespace,
			resource,
			name
		};
	}
};

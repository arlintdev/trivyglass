// File: trivy-glass/src/routes/[resource]/namespace/[namespace]/[name]/+page.server.ts
import type { PageServerLoad } from './$types';
import { dev } from '$app/environment';
import { getNamespacedResource, getCurrentClusterName } from '$lib/kubeUtil';

export const csr = dev;
export const prerender = false;

export const load: PageServerLoad = async ({ params }) => {
	const { namespace, resource, name } = params;

	console.log(`Loading namespaced resource: ${resource}/${name} in namespace ${namespace}`);

	try {
		// Use the kubeUtil function to get the resource
		const result = await getNamespacedResource(resource, namespace, name);
		// Return the result
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

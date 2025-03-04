// File: trivy-glass/src/routes/[resource]/cluster/[name]/+page.server.ts
import type { PageServerLoad } from './$types';
import { dev } from '$app/environment';
import { getClusterResource, getCurrentClusterName } from '$lib/kubeUtil';

export const csr = dev;
export const prerender = false;

export const load: PageServerLoad = async ({ params }) => {
	const { resource, name } = params;
	
	console.log(`Loading cluster resource: ${resource}/${name}`);
	
	try {
		// Use the kubeUtil function to get the resource
		const result = await getClusterResource(resource, name);
		
		// Return the result
		return result;
	} catch (err: any) {
		console.error(`Error in page server load: ${err.message}`);
		return {
			manifest: null,
			error: err.message,
			clusterName: getCurrentClusterName(),
			resource,
			name
		};
	}
};

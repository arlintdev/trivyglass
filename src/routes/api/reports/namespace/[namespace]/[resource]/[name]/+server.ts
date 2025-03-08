import { json } from '@sveltejs/kit';
import { getNamespacedResource } from '$lib/kubeUtil';

export async function GET({ params }) {
	try {
		const { namespace, resource, name } = params;

		console.log(`API: Fetching namespaced resource: ${resource}/${name} in namespace ${namespace}`);

		// Use the kubeUtil function to get the resource
		const result = await getNamespacedResource(resource, namespace, name);

		// Return the result
		return json(result);
	} catch (error) {
		console.error('Error fetching namespaced resource:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

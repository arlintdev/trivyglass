import { json } from '@sveltejs/kit';
import { getNamespacedResource } from '$lib/kubeUtil';
import { handleConnectionError } from '$lib/errorHandler';

export async function GET({
	params
}: {
	params: { namespace: string; resource: string; name: string };
}) {
	try {
		const { namespace, resource, name } = params;

		console.log(`API: Fetching namespaced resource: ${resource}/${name} in namespace ${namespace}`);

		// Use the kubeUtil function to get the resource
		const result = await getNamespacedResource(resource, namespace, name);

		// Return the result
		return json(result);
	} catch (error) {
		console.error('Error fetching namespaced resource:', error);
		// Handle connection errors with toast notifications
		handleConnectionError(error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

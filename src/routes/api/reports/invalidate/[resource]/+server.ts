import { json } from '@sveltejs/kit';
import { invalidateCache } from '$lib/kubeUtil';
import { handleConnectionError } from '$lib/errorHandler';

export async function POST({ params }: { params: { resource: string } }) {
	try {
		const { resource } = params;

		console.log(`API: Invalidating cache for resource: ${resource}`);

		// Invalidate the cache for this resource
		await invalidateCache(resource);

		return json({ success: true, message: `Cache invalidated for ${resource}` });
	} catch (error) {
		console.error('Error invalidating cache:', error);
		// Handle connection errors with toast notifications
		handleConnectionError(error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Unknown error',
				success: false
			},
			{ status: 500 }
		);
	}
}

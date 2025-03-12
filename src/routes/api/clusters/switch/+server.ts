import { json } from '@sveltejs/kit';
import { switchCluster } from '$lib/kubeUtil';
import { handleConnectionError } from '$lib/errorHandler';

export async function POST({ request }: { request: Request }) {
	try {
		const { name } = await request.json();

		if (!name) {
			return json({ message: 'Cluster name is required' }, { status: 400 });
		}

		await switchCluster(name);

		return json({ success: true });
	} catch (error) {
		console.error('Error switching cluster:', error);
		// Handle connection errors with toast notifications
		handleConnectionError(error);
		return json(
			{
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

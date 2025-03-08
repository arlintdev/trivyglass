import { json } from '@sveltejs/kit';
import { switchCluster } from '$lib/kubeUtil';

export async function POST({ request }) {
	try {
		const { name } = await request.json();

		if (!name) {
			return json({ message: 'Cluster name is required' }, { status: 400 });
		}

		await switchCluster(name);

		return json({ success: true });
	} catch (error) {
		console.error('Error switching cluster:', error);
		return json(
			{
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

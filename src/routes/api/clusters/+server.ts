import { json } from '@sveltejs/kit';
import { listClusters, saveCluster, getCurrentClusterName } from '$lib/kubeUtil';

export async function GET() {
	try {
		const clusters = await listClusters();
		const currentCluster = getCurrentClusterName();

		return json({
			clusters,
			currentCluster
		});
	} catch (error) {
		console.error('Error fetching clusters:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

export async function POST({ request }) {
	try {
		const { kubeconfig } = await request.json();

		if (!kubeconfig) {
			return json({ message: 'Kubeconfig is required' }, { status: 400 });
		}

		const savedContexts = await saveCluster(kubeconfig);

		return json({
			success: true,
			contexts: savedContexts
		});
	} catch (error) {
		console.error('Error saving cluster:', error);
		return json(
			{
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

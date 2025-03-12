import { json } from '@sveltejs/kit';
import { deleteCluster } from '$lib/kubeUtil';
import { handleConnectionError } from '$lib/errorHandler';

export async function DELETE({ params }: { params: { name: string } }) {
	try {
		const { name } = params;

		if (name === 'local') {
			return json({ message: 'Cannot delete local cluster' }, { status: 400 });
		}

		await deleteCluster(name);

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting cluster:', error);
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

import { json } from '@sveltejs/kit';
import { deleteCluster } from '$lib/kubeUtil';

export async function DELETE({ params }) {
	try {
		const { name } = params;

		if (name === 'local') {
			return json({ message: 'Cannot delete local cluster' }, { status: 400 });
		}

		await deleteCluster(name);

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting cluster:', error);
		return json(
			{
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

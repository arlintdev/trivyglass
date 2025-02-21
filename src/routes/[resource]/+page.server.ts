import type { PageServerLoad } from './$types';
import { loadReports } from '../../lib/kubeUtil';

export const load: PageServerLoad = async ({ params }) => {
	const { resource } = params;
	return await loadReports(resource);
};

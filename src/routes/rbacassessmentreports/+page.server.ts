import type { PageServerLoad } from './$types';
import { loadReports } from '../../lib/kubeUtil';

export const load: PageServerLoad = async () => {
	return await loadReports('rbacassessmentreports');
};

// File: trivy-glass/src/routes/vulnerabilityreports/+page.server.ts
import type { PageServerLoad } from './$types';
import { dev } from '$app/environment';
import { KubeConfig, CustomObjectsApi } from '@kubernetes/client-node';

export const csr = dev;
export const prerender = false;

export const load: PageServerLoad = async ({ params }) => {
	const { namespace, resource } = params;
	const kc = new KubeConfig();
	let clusterName = 'Unknown Cluster';

	if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
		console.log('Running in cluster; using in-cluster config');
		kc.loadFromCluster();
		clusterName = kc.getCurrentCluster()?.name || clusterName;
	} else {
		console.log('Running outside cluster; loading kubeconfig');
		kc.loadFromDefault();
		clusterName = kc.getCurrentCluster()?.name || clusterName;
	}

	const customObjectsApi = kc.makeApiClient(CustomObjectsApi);

	const CRD_GROUP = 'aquasecurity.github.io';
	const CRD_VERSION = 'v1alpha1';
	const CRD_PLURAL = 'infraassessmentreports';

	try {
		const result = await customObjectsApi.getNamespacedCustomObject({
			group: CRD_GROUP,
			version: CRD_VERSION,
			namespace,
			plural: CRD_PLURAL,
			name: resource
		});
		const report = result;
		return { report, clusterName };
	} catch (err: any) {
		return { report: null, error: err.message, clusterName };
	}
};

// src/lib/kubeUtils.ts
import { KubeConfig, CustomObjectsApi } from '@kubernetes/client-node';



export async function loadReports(crdPlural: string) {
  const kc = new KubeConfig();
  let clusterName = 'Unknown Cluster';

  if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
    kc.loadFromCluster();
    clusterName = kc.getCurrentCluster()?.name || clusterName;
  } else {
    kc.loadFromDefault();
    clusterName = kc.getCurrentCluster()?.name || clusterName;
  }

  const customObjectsApi = kc.makeApiClient(CustomObjectsApi);
  const CRD_GROUP = 'aquasecurity.github.io';
  const CRD_VERSION = 'v1alpha1';

  try {
    const result = await customObjectsApi.listCustomObjectForAllNamespaces({
      group: CRD_GROUP,
      version: CRD_VERSION,
      plural: crdPlural
    });
    const items = (result as any).items || [];
    return { reports: items, clusterName };
  } catch (err: any) {
    return { reports: [], error: err.message, clusterName };
  }
}
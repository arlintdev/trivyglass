import { json } from '@sveltejs/kit';
import { getClusterResource } from '$lib/kubeUtil';

export async function GET({ params }) {
  try {
    const { resource, name } = params;
    
    console.log(`API: Fetching cluster resource: ${resource}/${name}`);
    
    // Use the kubeUtil function to get the resource
    const result = await getClusterResource(resource, name);
    
    // Return the result
    return json(result);
  } catch (error) {
    console.error('Error fetching cluster resource:', error);
    return json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
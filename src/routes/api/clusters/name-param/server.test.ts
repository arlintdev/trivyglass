import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DELETE } from '../[name]/+server';
import * as kubeUtil from '../../../../lib/kubeUtil';

// Mock the kubeUtil module
vi.mock('../../../../lib/kubeUtil', () => {
  return {
    deleteCluster: vi.fn()
  };
});

// Mock SvelteKit's json function
vi.mock('@sveltejs/kit', () => {
  return {
    json: vi.fn((data, options) => {
      return { body: data, status: options?.status || 200 };
    })
  };
});

describe('Cluster Delete API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('deletes the specified cluster', async () => {
    const mockParams = {
      params: {
        name: 'test-cluster'
      }
    };
    
    vi.mocked(kubeUtil.deleteCluster).mockResolvedValue(undefined);
    
    const response = await DELETE(mockParams);
    
    expect(kubeUtil.deleteCluster).toHaveBeenCalledWith('test-cluster');
    expect(response.body).toEqual({
      success: true
    });
    expect(response.status).toBe(200);
  });

  it('returns 400 if trying to delete local cluster', async () => {
    const mockParams = {
      params: {
        name: 'local'
      }
    };
    
    const response = await DELETE(mockParams);
    
    expect(response.body).toEqual({
      message: 'Cannot delete local cluster'
    });
    expect(response.status).toBe(400);
  });

  it('handles errors', async () => {
    const mockParams = {
      params: {
        name: 'test-cluster'
      }
    };
    
    vi.mocked(kubeUtil.deleteCluster).mockRejectedValue(new Error('Test error'));
    
    const response = await DELETE(mockParams);
    
    expect(response.body).toEqual({
      message: 'Test error'
    });
    expect(response.status).toBe(500);
  });
});
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { POST } from './+server';
import * as kubeUtil from '../../../../lib/kubeUtil';

// Mock the kubeUtil module
vi.mock('../../../../lib/kubeUtil', () => {
  return {
    switchCluster: vi.fn()
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

describe('Cluster Switch API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('switches to the specified cluster', async () => {
    const mockRequest = {
      request: {
        json: vi.fn().mockResolvedValue({
          name: 'test-cluster'
        })
      }
    };
    
    vi.mocked(kubeUtil.switchCluster).mockResolvedValue(undefined);
    
    const response = await POST(mockRequest);
    
    expect(kubeUtil.switchCluster).toHaveBeenCalledWith('test-cluster');
    expect(response.body).toEqual({
      success: true
    });
    expect(response.status).toBe(200);
  });

  it('returns 400 if cluster name is missing', async () => {
    const mockRequest = {
      request: {
        json: vi.fn().mockResolvedValue({})
      }
    };
    
    const response = await POST(mockRequest);
    
    expect(response.body).toEqual({
      message: 'Cluster name is required'
    });
    expect(response.status).toBe(400);
  });

  it('handles errors', async () => {
    const mockRequest = {
      request: {
        json: vi.fn().mockResolvedValue({
          name: 'test-cluster'
        })
      }
    };
    
    vi.mocked(kubeUtil.switchCluster).mockRejectedValue(new Error('Test error'));
    
    const response = await POST(mockRequest);
    
    expect(response.body).toEqual({
      message: 'Test error'
    });
    expect(response.status).toBe(500);
  });
});
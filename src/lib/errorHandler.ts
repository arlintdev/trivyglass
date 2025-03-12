import { toastStore } from './stores/toastStore';

/**
 * Error types for different connection issues
 */
export enum ConnectionErrorType {
  CLUSTER = 'cluster_connection',
  REDIS = 'redis_connection',
  OTHER = 'other'
}

/**
 * Determines the type of connection error based on the error message
 * @param error The error object or message
 * @returns The type of connection error
 */
export function determineErrorType(error: unknown): ConnectionErrorType {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Check for cluster connection errors
  if (
    errorMessage.includes('Failed to connect to Kubernetes API') ||
    errorMessage.includes('Unable to connect to the server') ||
    errorMessage.includes('Cluster not found') ||
    errorMessage.includes('cluster not found') ||
    errorMessage.includes('No valid contexts found') ||
    errorMessage.includes('Invalid kubeconfig') ||
    errorMessage.toLowerCase().includes('cluster') ||
    errorMessage.toLowerCase().includes('kubernetes')
  ) {
    return ConnectionErrorType.CLUSTER;
  }
  
  // Check for Redis connection errors
  if (
    errorMessage.includes('Redis Client Error') ||
    errorMessage.includes('Failed to connect to Redis') ||
    errorMessage.includes('Redis connection')
  ) {
    return ConnectionErrorType.REDIS;
  }
  
  // Default to other errors
  return ConnectionErrorType.OTHER;
}

/**
 * Handles connection errors by displaying appropriate toast notifications
 * @param error The error object or message
 * @returns The error type that was handled
 */
export function handleConnectionError(error: unknown): ConnectionErrorType {
  const errorType = determineErrorType(error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  switch (errorType) {
    case ConnectionErrorType.CLUSTER:
      toastStore.addToast(
        `Cluster connection error: ${errorMessage}`,
        'error',
        7000
      );
      break;
    case ConnectionErrorType.REDIS:
      toastStore.addToast(
        `Cache connection error: ${errorMessage}`,
        'warning',
        7000
      );
      break;
    case ConnectionErrorType.OTHER:
      toastStore.addToast(
        `Application error: ${errorMessage}`,
        'info',
        5000
      );
      break;
  }
  
  return errorType;
}
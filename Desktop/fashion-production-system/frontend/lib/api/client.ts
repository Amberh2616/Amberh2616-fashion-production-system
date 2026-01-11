/**
 * API Client Configuration
 * Base URL and common fetch wrapper
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v2';

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

/**
 * Enhanced fetch wrapper with error handling
 */
export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
      },
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw {
          message: `HTTP Error: ${response.status} ${response.statusText}`,
          status: response.status,
        } as ApiError;
      }
      return null as T;
    }

    const json = await response.json();

    if (!response.ok) {
      throw {
        message: json.detail || json.message || 'Request failed',
        status: response.status,
        errors: json.errors,
      } as ApiError;
    }

    // Handle standard API response format: { data: T, meta: {...}, errors: [] }
    // Return the data field if present, otherwise return the whole response
    if (json && typeof json === 'object' && 'data' in json) {
      return json.data as T;
    }

    return json as T;
  } catch (error) {
    if ((error as ApiError).status) {
      throw error;
    }

    // Network or parsing error
    throw {
      message: error instanceof Error ? error.message : 'Network error',
      status: 0,
    } as ApiError;
  }
}

/**
 * Upload file with FormData
 */
export async function uploadFile<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type, browser will set it with boundary
  });
}

// Object-style API client (for compatibility)
apiClient.get = async function<T>(endpoint: string): Promise<T> {
  return apiClient<T>(endpoint, { method: 'GET' });
};

apiClient.post = async function<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'POST',
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
};

apiClient.patch = async function<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

apiClient.delete = async function<T>(endpoint: string): Promise<T> {
  return apiClient<T>(endpoint, { method: 'DELETE' });
};

export { API_BASE_URL };

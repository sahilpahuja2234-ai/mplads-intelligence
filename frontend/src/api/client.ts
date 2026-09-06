const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.error?.message) {
          errorMsg = errorData.error.message;
        }
      } catch (_) {}
      throw new Error(errorMsg);
    }

    return await response.json() as T;
  } catch (err) {
    // If backend is unavailable, log warning and let MSW or callers catch
    console.warn(`[API Client] Error fetching ${endpoint}:`, err);
    throw err;
  }
}

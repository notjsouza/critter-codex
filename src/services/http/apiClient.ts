const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '') ?? '';

export function isApiConfigured() {
  return apiBaseUrl.length > 0;
}

function buildUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

export async function apiRequest(path: string, init?: RequestInit): Promise<Response> {
  if (!isApiConfigured()) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured.');
  }

  return fetch(buildUrl(path), init);
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiRequest(path, init);
  if (!response.ok) {
    throw new Error(`API request failed (${response.status}) for ${path}`);
  }

  return (await response.json()) as T;
}
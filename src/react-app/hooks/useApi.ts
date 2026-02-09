import { useState, useEffect, useCallback, type DependencyList } from 'react';

// In production, the API is served from the same origin (pokercircuit.app)
// No need for a different base URL - both frontend and API are on the same domain
const API_BASE_URL = '';

export function useApi<T>(url: string, deps: DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const currentChampionship = localStorage.getItem('current_championship');
      const championshipId = currentChampionship ? JSON.parse(currentChampionship).id : null;

      const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

      const response = await fetch(fullUrl, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(championshipId ? { 'X-Championship-Id': String(championshipId) } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    refresh();
  }, [refresh, ...deps]);

  return { data, loading, error, refresh };
}

export async function apiRequest(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_token');
  const currentChampionship = localStorage.getItem('current_championship');
  const championshipId = currentChampionship ? JSON.parse(currentChampionship).id : null;

  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(championshipId ? { 'X-Championship-Id': String(championshipId) } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Request failed' }));
    const debugInfo = errorBody.debug ? ' Debug: ' + JSON.stringify(errorBody.debug) : '';
    throw new Error((errorBody.error || `HTTP error! status: ${response.status}`) + debugInfo);
  }

  return response.json();
}

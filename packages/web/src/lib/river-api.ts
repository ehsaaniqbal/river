import type { HistoryResponse, StatsResponse } from '@river/shared';

function serverHttpUrl(): string {
  return process.env.NEXT_PUBLIC_RIVER_SERVER_URL ?? 'http://localhost:8787';
}

function storedToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem('river:token');
}

async function fetchRiver<T>(path: string): Promise<T | null> {
  const token = storedToken();

  if (!token) {
    return null;
  }

  const response = await fetch(`${serverHttpUrl()}${path}`, {
    headers: {
      'x-river-token': token,
    },
  });

  if (!response.ok) {
    return null;
  }

  return await response.json() as T;
}

export async function fetchRiverStats(): Promise<StatsResponse | null> {
  return await fetchRiver<StatsResponse>('/stats');
}

export async function fetchRiverHistory(limit = 50): Promise<HistoryResponse | null> {
  return await fetchRiver<HistoryResponse>(`/history?limit=${limit}`);
}

const TTL_MS = 4000;

export type InstallStatusResponse = {
  configured: boolean;
  needsRestart?: boolean;
  installMode?: boolean;
};

let cache: { at: number; value: InstallStatusResponse } | null = null;

function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  const s = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : '/api';
  return s.replace(/\/$/, '');
}

async function fetchInstallStatusRaw(): Promise<InstallStatusResponse> {
  const r = await fetch(`${apiBase()}/install/status`, {
    credentials: 'omit',
    headers: { Accept: 'application/json' },
  });
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}`);
  }
  return (await r.json()) as InstallStatusResponse;
}

/**
 * Cached install status. On network error, assumes configured so the SPA is not stuck.
 */
export async function getInstallStatus(): Promise<InstallStatusResponse> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return cache.value;
  }
  try {
    const value = await fetchInstallStatusRaw();
    cache = { at: now, value };
    return value;
  } catch {
    return {
      configured: true,
      needsRestart: false,
      installMode: false,
    };
  }
}

export function clearInstallStatusCache(): void {
  cache = null;
}

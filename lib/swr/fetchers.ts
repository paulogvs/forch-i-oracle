export async function jsonFetcher<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[${res.status}] ${body || res.statusText}`);
  }
  return res.json();
}

export async function postFetcher<T = unknown>(url: string, body: unknown): Promise<T> {
  return jsonFetcher<T>(url, { method: 'POST', body: JSON.stringify(body ?? {}) });
}

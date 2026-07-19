// Shared in-memory nonce store used by both /api/auth/nonce and /api/auth/verify
// When MongoDB is unavailable, nonces live here instead.

interface NonceEntry {
  nonce: string;
  createdAt: string;
}

const store = new Map<string, NonceEntry>();

export function setNonce(address: string, nonce: string): void {
  store.set(address.toLowerCase(), { nonce, createdAt: new Date().toISOString() });
}

export function consumeNonce(address: string): string | null {
  const entry = store.get(address.toLowerCase());
  if (!entry) return null;
  store.delete(address.toLowerCase());
  return entry.nonce;
}

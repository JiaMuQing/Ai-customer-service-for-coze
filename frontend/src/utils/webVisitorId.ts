const STORAGE_KEY = 'web_chat_visitor_id';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuidV4(id: string): boolean {
  return UUID_V4.test(id.trim());
}

/** Stable per-browser id for anonymous web chat (no login). */
export function getOrCreateWebVisitorId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && isValidUuidV4(existing)) return existing.trim();
  } catch {
    /* ignore */
  }
  let id: string;
  try {
    id = crypto.randomUUID();
  } catch {
    id = `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  return id;
}

// Ephemeral, user/client-scoped drafts. Never persist credentials or content to browser storage.
const drafts = new Map<string, Record<string, unknown>>();
export function readPackageDraft<T>(key: string, fallback: T): T { return (drafts.get(key) as T | undefined) ?? fallback; }
export function writePackageDraft(key: string, value: Record<string, unknown>) { drafts.set(key, value); }
export function clearPackageDrafts() { drafts.clear(); }

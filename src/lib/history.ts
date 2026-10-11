export const HISTORY_LIMIT = 20;

export type HistoryEntry = { id: string; label: string; at: number };

/** 新しい結果を先頭に追加し、最新20件だけ残す。 */
export function addHistory(history: readonly HistoryEntry[], label: string, at: number): HistoryEntry[] {
  const id = `${at}-${Math.random().toString(36).slice(2, 8)}`;
  return [{ id, label, at }, ...history].slice(0, HISTORY_LIMIT);
}

export function removeHistory(history: readonly HistoryEntry[], id: string): HistoryEntry[] {
  return history.filter((h) => h.id !== id);
}

export function sanitizeHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: HistoryEntry[] = [];
  for (const h of raw) {
    if (h && typeof h.id === 'string' && typeof h.label === 'string' && Number.isFinite(h.at)) {
      out.push({ id: h.id, label: h.label, at: h.at });
    }
  }
  return out.slice(0, HISTORY_LIMIT);
}

const p2 = (n: number) => String(n).padStart(2, '0');

/** 例: 10/11 09:05 （端末のローカル時刻） */
export function formatDateTime(at: number): string {
  const d = new Date(at);
  return `${d.getMonth() + 1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

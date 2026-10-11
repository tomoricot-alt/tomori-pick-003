// 選択肢の検証・編集ロジック（純粋関数）
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 12;
export const MAX_LABEL_LENGTH = 20;

export const DEFAULT_OPTIONS: readonly string[] = ['ラーメン', 'カレー', '寿司', 'パスタ'];

/** 比較用に正規化（前後空白除去・全角半角統一・大文字小文字無視）。 */
export function normalizeKey(label: string): string {
  return label.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** 表示用に整形（前後空白除去・連続空白を1つに）。 */
export function cleanLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ');
}

export type Validation = { ok: true; label: string } | { ok: false; error: string };

/**
 * 1件の入力を検証する。`ignoreIndex` は編集中の自分自身を重複判定から除外するために使う。
 */
export function validateLabel(input: string, existing: readonly string[], ignoreIndex?: number): Validation {
  const label = cleanLabel(input);
  if (label === '') return { ok: false, error: '選択肢を入力してください' };
  if ([...label].length > MAX_LABEL_LENGTH) {
    return { ok: false, error: `${MAX_LABEL_LENGTH}文字以内で入力してください` };
  }
  const key = normalizeKey(label);
  const duplicated = existing.some((e, i) => i !== ignoreIndex && normalizeKey(e) === key);
  if (duplicated) return { ok: false, error: '同じ名前の選択肢がすでにあります' };
  return { ok: true, label };
}

export type Change = { ok: true; options: string[] } | { ok: false; error: string };

export function addOption(options: readonly string[], input: string): Change {
  if (options.length >= MAX_OPTIONS) return { ok: false, error: `選択肢は${MAX_OPTIONS}個までです` };
  const v = validateLabel(input, options);
  return v.ok ? { ok: true, options: [...options, v.label] } : v;
}

export function editOption(options: readonly string[], index: number, input: string): Change {
  if (index < 0 || index >= options.length) return { ok: false, error: '選択肢が見つかりません' };
  const v = validateLabel(input, options, index);
  if (!v.ok) return v;
  const next = [...options];
  next[index] = v.label;
  return { ok: true, options: next };
}

export function removeOption(options: readonly string[], index: number): Change {
  if (index < 0 || index >= options.length) return { ok: false, error: '選択肢が見つかりません' };
  if (options.length <= MIN_OPTIONS) return { ok: false, error: `選択肢は${MIN_OPTIONS}個以上必要です` };
  return { ok: true, options: options.filter((_, i) => i !== index) };
}

export function canSpin(options: readonly string[]): boolean {
  return options.length >= MIN_OPTIONS && options.length <= MAX_OPTIONS;
}

/** 保存データの復元。壊れた値・重複・上限超過を取り除き、足りなければ初期値に戻す。 */
export function sanitizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_OPTIONS];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const v = validateLabel(item, out);
    if (v.ok) out.push(v.label);
    if (out.length >= MAX_OPTIONS) break;
  }
  return out.length >= MIN_OPTIONS ? out : [...DEFAULT_OPTIONS];
}

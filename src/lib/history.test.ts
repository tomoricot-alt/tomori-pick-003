import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addHistory, removeHistory, sanitizeHistory, formatDateTime, HISTORY_LIMIT, HistoryEntry } from './history';

test('履歴は新しい順で、最大20件に制限される', () => {
  let h: HistoryEntry[] = [];
  for (let i = 0; i < 25; i++) h = addHistory(h, `結果${i}`, 1_000 + i);
  assert.equal(h.length, HISTORY_LIMIT);
  assert.equal(h[0].label, '結果24');
  assert.equal(h[19].label, '結果5');
});

test('同時刻でも id は重複しにくい', () => {
  let h: HistoryEntry[] = [];
  for (let i = 0; i < 20; i++) h = addHistory(h, 'x', 5);
  assert.equal(new Set(h.map((e) => e.id)).size, 20);
});

test('履歴の個別削除', () => {
  const h = addHistory(addHistory([], 'A', 1), 'B', 2);
  assert.deepEqual(removeHistory(h, h[0].id).map((e) => e.label), ['A']);
});

test('sanitizeHistory: 壊れたデータを除外', () => {
  assert.deepEqual(sanitizeHistory('x'), []);
  const r = sanitizeHistory([{ id: 'a', label: 'A', at: 1 }, { id: 1 }, null, { id: 'b', label: 'B', at: NaN }]);
  assert.deepEqual(r, [{ id: 'a', label: 'A', at: 1 }]);
});

test('日時の整形 (M/D HH:mm)', () => {
  assert.equal(formatDateTime(new Date(2026, 9, 11, 9, 5).getTime()), '10/11 09:05');
});

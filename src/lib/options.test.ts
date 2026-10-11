import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addOption, editOption, removeOption, validateLabel, sanitizeOptions, canSpin, MAX_OPTIONS, DEFAULT_OPTIONS } from './options';

test('追加: 前後の空白を除去して追加できる', () => {
  const r = addOption(['A', 'B'], '  C  ');
  assert.deepEqual(r, { ok: true, options: ['A', 'B', 'C'] });
});

test('空欄・空白のみは拒否', () => {
  assert.equal(addOption(['A'], '').ok, false);
  assert.equal(addOption(['A'], '   　 ').ok, false);
});

test('重複は拒否（大文字小文字・全角半角・前後空白を無視）', () => {
  assert.equal(addOption(['Ramen'], 'ramen').ok, false);
  assert.equal(addOption(['ＡＢＣ'], 'abc').ok, false);
  assert.equal(addOption(['カレー'], ' カレー ').ok, false);
  assert.equal(addOption(['カレー'], 'カレーうどん').ok, true);
});

test('20文字を超える入力は拒否、20文字ちょうどは許可', () => {
  assert.equal(validateLabel('あ'.repeat(21), []).ok, false);
  assert.equal(validateLabel('あ'.repeat(20), []).ok, true);
});

test('上限12個: 13個目は追加できない', () => {
  let opts: string[] = [];
  for (let i = 0; i < MAX_OPTIONS; i++) {
    const r = addOption(opts, `案${i}`);
    assert.ok(r.ok);
    if (r.ok) opts = r.options;
  }
  assert.equal(opts.length, 12);
  assert.equal(addOption(opts, '案12').ok, false);
});

test('編集: 自分自身と同じ名前への変更は可、他と重複は不可', () => {
  const o = ['A', 'B', 'C'];
  assert.deepEqual(editOption(o, 1, 'B'), { ok: true, options: o });
  assert.deepEqual(editOption(o, 1, ' b2 '), { ok: true, options: ['A', 'b2', 'C'] });
  assert.equal(editOption(o, 1, 'a').ok, false);
  assert.equal(editOption(o, 1, '').ok, false);
  assert.equal(editOption(o, 9, 'x').ok, false);
});

test('削除: 2個未満にはできない', () => {
  assert.deepEqual(removeOption(['A', 'B', 'C'], 1), { ok: true, options: ['A', 'C'] });
  assert.equal(removeOption(['A', 'B'], 0).ok, false);
});

test('canSpin は 2〜12個のみ true', () => {
  assert.equal(canSpin(['A']), false);
  assert.equal(canSpin(['A', 'B']), true);
  assert.equal(canSpin(Array.from({ length: 12 }, (_, i) => `${i}`)), true);
  assert.equal(canSpin(Array.from({ length: 13 }, (_, i) => `${i}`)), false);
});

test('sanitizeOptions: 壊れた保存データを修復する', () => {
  assert.deepEqual(sanitizeOptions(null), [...DEFAULT_OPTIONS]);
  assert.deepEqual(sanitizeOptions(['A']), [...DEFAULT_OPTIONS]); // 2個未満は初期値
  assert.deepEqual(sanitizeOptions(['A', 'a', '', 5, ' B ']), ['A', 'B']);
  assert.equal(sanitizeOptions(Array.from({ length: 30 }, (_, i) => `案${i}`)).length, 12);
});

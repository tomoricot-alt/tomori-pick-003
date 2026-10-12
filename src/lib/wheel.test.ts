import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSlices, colorIndexes, polar, shortLabel } from './wheel';

test('隣り合う扇形（最後と最初を含む）は2〜12個すべてで色が異なる', () => {
  for (let n = 2; n <= 12; n++) {
    const c = colorIndexes(n);
    for (let i = 0; i < n; i++) {
      assert.notEqual(c[i], c[(i + 1) % n], `n=${n} i=${i}`);
    }
  }
});

test('扇形の数・ラベル角度が選択肢と一致', () => {
  const s = buildSlices(['A', 'B', 'C'], 300);
  assert.equal(s.length, 3);
  assert.deepEqual(s.map((x) => x.labelAngle), [60, 180, 300]);
});

test('polar: 0°は真上、90°は右', () => {
  assert.deepEqual(polar(100, 100, 50, 0), { x: 100, y: 50 });
  assert.deepEqual(polar(100, 100, 50, 90), { x: 150, y: 100 });
});

test('長いラベルは省略表示', () => {
  assert.equal(shortLabel('あいうえお', 9), 'あいうえお');
  assert.equal(shortLabel('あいうえおかきくけこ', 6), 'あいうえお…');
});

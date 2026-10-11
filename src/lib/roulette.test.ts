import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomIndex, indexAtRotation, targetRotation, normalizeDeg, randomJitter, defaultRandomUint32 } from './roulette';

/** 再現可能な疑似乱数 (mulberry32) を uint32 で返す */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0);
  };
}

test('randomIndex: 範囲外の値を返さない', () => {
  const rand = seeded(1);
  for (const n of [1, 2, 3, 7, 12]) {
    for (let i = 0; i < 1000; i++) {
      const v = randomIndex(n, rand);
      assert.ok(Number.isInteger(v) && v >= 0 && v < n);
    }
  }
  assert.throws(() => randomIndex(0));
});

test('randomIndex: 剰余バイアスを棄却サンプリングで除去する', () => {
  // n=3 のとき 2^32 % 3 = 1。limit 以上の値(=4294967295)は捨てて引き直す。
  const seq = [0xffffffff, 4];
  let i = 0;
  assert.equal(randomIndex(3, () => seq[i++]), 1); // 4 % 3
  assert.equal(i, 2);
});

test('randomIndex: 2〜12個すべてで偏りがない（カイ二乗検定）', () => {
  // 自由度 df に対する p=0.001 の臨界値
  const critical: Record<number, number> = { 1: 10.83, 2: 13.82, 3: 16.27, 4: 18.47, 5: 20.52, 6: 22.46, 7: 24.32, 8: 26.12, 9: 27.88, 10: 29.59, 11: 31.26 };
  const rand = seeded(20261011);
  const TRIALS = 120_000;
  for (let n = 2; n <= 12; n++) {
    const counts = new Array(n).fill(0);
    for (let t = 0; t < TRIALS; t++) counts[randomIndex(n, rand)]++;
    const expected = TRIALS / n;
    const chi2 = counts.reduce((s, c) => s + (c - expected) ** 2 / expected, 0);
    assert.ok(chi2 < critical[n - 1], `n=${n}: chi2=${chi2.toFixed(2)} が臨界値 ${critical[n - 1]} を超過 (${counts})`);
  }
});

test('randomIndex: 実際の乱数源でも全選択肢が出る', () => {
  const seen = new Set<number>();
  for (let i = 0; i < 2000; i++) seen.add(randomIndex(12, defaultRandomUint32));
  assert.equal(seen.size, 12);
});

test('停止位置と結果の一致: 全 n・全 index・様々な開始角・ずれで検証', () => {
  const jitters = [-1, -0.5, 0, 0.5, 1];
  for (let n = 2; n <= 12; n++) {
    for (let index = 0; index < n; index++) {
      for (const current of [0, 17.3, 359.9, 360, 1234.5, 9999.99]) {
        for (const j of jitters) {
          const target = targetRotation(current, index, n, 5, j);
          assert.equal(indexAtRotation(target, n), index, `n=${n} index=${index} current=${current} jitter=${j}`);
          assert.ok(target >= current + 5 * 360, '最低5周は回る');
          assert.ok(target < current + 6 * 360 + 1e-6, '回りすぎない');
        }
      }
    }
  }
});

test('停止位置は境界線から十分離れる（扇形幅の20%以上）', () => {
  for (let n = 2; n <= 12; n++) {
    const theta = 360 / n;
    for (let index = 0; index < n; index++) {
      for (const j of [-1, 1]) {
        const target = targetRotation(100, index, n, 5, j);
        const posInSlice = normalizeDeg(-target) - index * theta;
        assert.ok(posInSlice > theta * 0.19 && posInSlice < theta * 0.81, `n=${n} pos=${posInSlice}`);
      }
    }
  }
});

test('連続して回しても（回転量が増え続けても）一致し続ける', () => {
  const rand = seeded(7);
  let rot = 0;
  for (let k = 0; k < 500; k++) {
    const n = 2 + (rand() % 11);
    const idx = randomIndex(n, rand);
    rot = targetRotation(rot % 360, idx, n, 5, randomJitter(rand));
    assert.equal(indexAtRotation(rot, n), idx);
  }
});

test('indexAtRotation: 0°は先頭の扇形、各境界の直前直後で切り替わる', () => {
  assert.equal(indexAtRotation(0, 4), 0);
  // ホイールを時計回りに回すと、ポインターは反時計側(末尾の扇形)へ進む
  assert.equal(indexAtRotation(1, 4), 3);
  assert.equal(indexAtRotation(89, 4), 3);
  assert.equal(indexAtRotation(91, 4), 2);
  assert.equal(indexAtRotation(360, 4), 0);
});

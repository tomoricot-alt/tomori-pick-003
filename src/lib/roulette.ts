// 抽選と回転角の計算（純粋関数）。
// 角度は「ホイールを時計回りに回した量(度)」。ポインターは常に真上(0°)に固定。
// i 番目の扇形は、ホイール座標で [i*θ, (i+1)*θ) （真上から時計回り）を占める。

export type RandomUint32 = () => number;

/** 暗号品質の乱数(0〜2^32-1)。Web/Hermes どちらも crypto が無ければ Math.random にフォールバック。 */
export const defaultRandomUint32: RandomUint32 = () => {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0];
  return Math.floor(Math.random() * 0x100000000);
};

/**
 * 0〜n-1 を完全に均等な確率で返す（棄却サンプリングで剰余バイアスを排除）。
 */
export function randomIndex(n: number, rand: RandomUint32 = defaultRandomUint32): number {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  const range = 0x100000000;
  const limit = range - (range % n); // これ以上の値は捨てて引き直す
  for (;;) {
    const v = rand();
    if (v < limit) return v % n;
  }
}

export const normalizeDeg = (deg: number): number => ((deg % 360) + 360) % 360;

/** 回転量 rotation のとき、真上のポインターが指している扇形の番号。 */
export function indexAtRotation(rotation: number, n: number): number {
  const theta = 360 / n;
  const idx = Math.floor(normalizeDeg(-rotation) / theta);
  return Math.min(idx, n - 1); // 浮動小数点で n になる端のケース対策
}

/**
 * index 番目の扇形がポインター位置で止まる最終回転量を返す。
 * - current より必ず spins 周以上、時計回りに進む
 * - 扇形の中心から ±(θ/2 × spread) 以内にずらして止まる（境界線ぎわを避ける）
 * @param jitter -1〜1。扇形内での止まる位置のずれ
 */
export function targetRotation(
  current: number,
  index: number,
  n: number,
  spins = 5,
  jitter = 0,
  spread = 0.6,
): number {
  const theta = 360 / n;
  const offset = (index + 0.5) * theta + jitter * (theta / 2) * spread; // 扇形内の止まりたい角度
  const wanted = normalizeDeg(-offset); // そのためのホイール回転量(0〜360)
  const base = Math.floor(current / 360) * 360;
  let target = base + wanted;
  while (target < current + spins * 360) target += 360;
  return target;
}

/** -1〜1 の揺らぎ（見た目用。結果には影響しない）。 */
export function randomJitter(rand: RandomUint32 = defaultRandomUint32): number {
  return (rand() / 0xffffffff) * 2 - 1;
}

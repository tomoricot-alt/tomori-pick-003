// ルーレット描画用の幾何・配色ロジック（純粋関数）
export type Slice = { path: string; fill: string; textColor: string; labelAngle: number; label: string };

const PALETTE: { fill: string; text: string }[] = [
  { fill: '#2F5D50', text: '#FFFFFF' }, // 深緑
  { fill: '#E8883A', text: '#2A2118' }, // オレンジ
  { fill: '#5B7C8D', text: '#FFFFFF' }, // くすみブルー
  { fill: '#E9C46A', text: '#2A2118' }, // マスタード
  { fill: '#B5573F', text: '#FFFFFF' }, // テラコッタ
  { fill: '#8FB09C', text: '#1F2A25' }, // セージ
  { fill: '#7A5C7E', text: '#FFFFFF' }, // くすみプラム
];

/** 隣り合う扇形（最後と最初を含む）が同じ色にならないよう配色する。 */
export function colorIndexes(n: number): number[] {
  const out = Array.from({ length: n }, (_, i) => i % PALETTE.length);
  if (n > 2 && out[n - 1] === out[0]) {
    out[n - 1] = PALETTE.findIndex((_, c) => c !== out[0] && c !== out[n - 2]);
  }
  return out;
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** 真上を 0° として時計回りの角度 → SVG 座標 */
export function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  return { x: r2(cx + r * Math.sin(rad(deg))), y: r2(cy - r * Math.cos(rad(deg))) };
}

export function slicePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const a = polar(cx, cy, r, startDeg);
  const b = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y} Z`;
}

/** ホイール上に表示する短縮ラベル */
export function shortLabel(label: string, max: number): string {
  const chars = [...label];
  return chars.length > max ? chars.slice(0, max - 1).join('') + '…' : label;
}

export function buildSlices(labels: readonly string[], size: number): Slice[] {
  const n = labels.length;
  const c = size / 2;
  const r = c - 4;
  const theta = 360 / n;
  const colors = colorIndexes(n);
  const maxChars = n <= 6 ? 9 : n <= 9 ? 7 : 6;
  return labels.map((label, i) => {
    const p = PALETTE[colors[i]];
    return {
      path: slicePath(c, c, r, i * theta, (i + 1) * theta),
      fill: p.fill,
      textColor: p.text,
      labelAngle: (i + 0.5) * theta,
      label: shortLabel(label, maxChars),
    };
  });
}

export function labelFontSize(n: number, size: number): number {
  const base = n <= 4 ? 20 : n <= 8 ? 17 : 14;
  return Math.round((base * size) / 340);
}

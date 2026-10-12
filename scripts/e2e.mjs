// Web版の動作確認（Playwright + Chromium）。事前に `npm run build:web` が必要。
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { serve } from './serve-dist.mjs';

const executablePath = process.env.CHROMIUM_PATH || undefined;
const server = await serve(4173);
const url = 'http://localhost:4173/tomori-pick-003/';
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const results = [];
const check = async (name, fn) => { await fn(); results.push(name); console.log('✔', name); };
const DEFAULTS = ['ラーメン', 'カレー', '寿司', 'パスタ'];

/** ホイールの現在角度(度, 時計回り)から、真上のポインターが指す選択肢の番号を求める */
async function pointerIndex(page, n) {
  const angle = await page.getByTestId('wheel').evaluate((el) => {
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return (Math.atan2(m.b, m.a) * 180) / Math.PI;
  });
  const norm = ((-angle % 360) + 360) % 360;
  return Math.min(Math.floor(norm / (360 / n)), n - 1);
}

async function setup({ reducedMotion = 'no-preference', viewport = { width: 390, height: 844 }, mobile = true } = {}) {
  const ctx = await browser.newContext({
    viewport, hasTouch: mobile, isMobile: mobile, locale: 'ja-JP', reducedMotion,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install({ time: new Date(2026, 9, 11, 10, 0, 0) });
  await page.goto(url);
  await page.getByText('迷ったら、回そう。').waitFor();
  return { ctx, page, errors };
}

const addOpt = async (page, text) => {
  await page.getByTestId('add-input').fill(text);
  await page.getByTestId('add-button').click();
};
const labels = (page) => page.locator('[data-testid^="delete-"]').count();
const spinOnce = async (page, n, expectedLabels) => {
  await page.getByTestId('spin-button').click();
  await page.clock.runFor(4600);
  const result = await page.getByTestId('result').innerText();
  const idx = await pointerIndex(page, n);
  assert.equal(expectedLabels[idx], result, `停止位置(${expectedLabels[idx]})と結果(${result})が不一致`);
  return result;
};

try {
  // ---------- 通常モーション ----------
  const { page, errors } = await setup();

  await check('初期表示: 日本語UIと初期の選択肢4個', async () => {
    await page.getByText('TOMORI PICK').first().waitFor();
    await page.getByText('選択肢', { exact: true }).waitFor();
    assert.equal(await labels(page), 4);
    await page.getByText('4 / 12').waitFor();
  });

  await check('回転中はアニメーションし、多重操作できず、停止後に結果と履歴が出る', async () => {
    const btn = page.getByTestId('spin-button');
    await btn.click();
    await page.clock.runFor(1000);
    assert.equal(await page.getByTestId('result').count(), 0, '回転中に結果が出ている');
    assert.equal(await btn.getAttribute('aria-disabled'), 'true');
    await btn.click({ force: true }); // 多重操作
    await btn.click({ force: true });
    // 回転中は編集系も無効
    assert.equal(await page.getByTestId('add-button').getAttribute('aria-disabled'), 'true');
    await page.clock.runFor(4000);
    await page.getByTestId('result').waitFor();
    assert.equal(await page.getByTestId('history-row').count(), 1, '多重操作で履歴が増えた');
    assert.equal(await btn.getAttribute('aria-disabled'), null);
    const result = await page.getByTestId('result').innerText();
    assert.equal(DEFAULTS[await pointerIndex(page, 4)], result);
  });

  await check('停止位置と結果の一致（4択を15回）', async () => {
    for (let i = 0; i < 15; i++) await spinOnce(page, 4, DEFAULTS);
  });

  await check('結果をコピーできる', async () => {
    const result = await page.getByTestId('result').innerText();
    await page.getByTestId('copy-button').click();
    await page.getByText('コピーしました').waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), result);
  });

  await check('選択肢の追加・前後空白の除去', async () => {
    await addOpt(page, '  うどん  ');
    assert.equal(await labels(page), 5);
    await page.getByText('うどん', { exact: true }).first().waitFor();
  });

  await check('不正入力の防止: 空欄・空白のみ・重複・21文字以上', async () => {
    await addOpt(page, '');
    await page.getByText('選択肢を入力してください').waitFor();
    await addOpt(page, '   ');
    await page.getByText('選択肢を入力してください').waitFor();
    await addOpt(page, 'カレー');
    await page.getByText('同じ名前の選択肢がすでにあります').waitFor();
    await addOpt(page, 'ＵＤＯＮ'); // 全角
    await addOpt(page, 'udon');
    await page.getByText('同じ名前の選択肢がすでにあります').waitFor();
    await addOpt(page, 'あ'.repeat(21));
    await page.getByText('20文字以内で入力してください').waitFor();
    assert.equal(await labels(page), 6); // ＵＤＯＮ のみ追加された
  });

  await check('選択肢の編集（保存・重複エラー）', async () => {
    await page.getByTestId('edit-1').click();
    await page.getByTestId('edit-input-1').fill('カレー');
    await page.getByTestId('save-1').click(); // 自分自身と同じ名前はOK
    await page.getByTestId('edit-1').click();
    await page.getByTestId('edit-input-1').fill('寿司');
    await page.getByTestId('save-1').click();
    await page.getByText('同じ名前の選択肢がすでにあります').waitFor();
    await page.getByTestId('edit-input-1').fill('ハンバーグ');
    await page.getByTestId('save-1').click();
    await page.getByText('ハンバーグ', { exact: true }).first().waitFor();
  });

  await check('選択肢の削除（6個→2個。2個未満にはできない）', async () => {
    while ((await labels(page)) > 2) await page.getByTestId('delete-0').click();
    assert.equal(await page.getByTestId('delete-0').getAttribute('aria-disabled'), 'true');
    assert.equal(await labels(page), 2);
  });

  await check('2個の選択肢で正常動作（停止位置=結果、10回）', async () => {
    const texts = await page.locator('[data-testid^="edit-"]:not([data-testid^="edit-input"])').count();
    assert.equal(texts, 2);
    const cur = [];
    for (let i = 0; i < 2; i++) cur.push((await page.getByLabel(/を編集$/).nth(i).getAttribute('aria-label')).replace('を編集', ''));
    for (let i = 0; i < 10; i++) await spinOnce(page, 2, cur);
  });

  await check('12個まで追加でき、13個目は拒否される。12個で正常動作', async () => {
    for (let i = 0; i < 10; i++) await addOpt(page, `案${i + 1}`);
    assert.equal(await labels(page), 12);
    await page.getByText('12 / 12').waitFor();
    assert.equal(await page.getByTestId('add-button').getAttribute('aria-disabled'), 'true');
    const cur = [];
    for (let i = 0; i < 12; i++) cur.push((await page.getByLabel(/を編集$/).nth(i).getAttribute('aria-label')).replace('を編集', ''));
    for (let i = 0; i < 12; i++) await spinOnce(page, 12, cur);
  });

  await check('リロード後も選択肢と履歴が保持される', async () => {
    const before = await page.getByTestId('history-row').count();
    assert.ok(before > 0);
    await page.reload();
    await page.getByText('12 / 12').waitFor();
    await page.getByTestId('history-row').first().waitFor();
    assert.equal(await page.getByTestId('history-row').count(), before);
  });

  await check('履歴の個別削除・全削除（確認あり）', async () => {
    const before = await page.getByTestId('history-row').count();
    await page.getByRole('button', { name: /の履歴を削除$/ }).first().click();
    assert.equal(await page.getByTestId('history-row').count(), before - 1);
    await page.getByTestId('history-clear').click();
    await page.getByText('履歴をすべて削除しますか？').waitFor();
    await page.getByTestId('history-clear-yes').click();
    await page.getByText('まだ履歴はありません').waitFor();
    await page.reload();
    await page.getByText('まだ履歴はありません').waitFor(); // 削除も保存される
  });

  await check('横スクロールなし(iPhone幅 390px)', async () => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  });
  await page.screenshot({ path: process.env.SHOT || 'e2e-screenshot.png', fullPage: true });
  assert.deepEqual(errors, []);

  // ---------- 動きの軽減 + 履歴20件上限 ----------
  const r = await setup({ reducedMotion: 'reduce' });
  await check('動きの軽減: 回転アニメーション無しで即座に結果が出る＋履歴は最新20件', async () => {
    for (let i = 0; i < 23; i++) {
      await r.page.getByTestId('spin-button').click();
      await r.page.getByTestId('result').waitFor();
      assert.equal(DEFAULTS[await pointerIndex(r.page, 4)], await r.page.getByTestId('result').innerText());
    }
    assert.equal(await r.page.getByTestId('history-row').count(), 20);
  });
  assert.deepEqual(r.errors, []);

  // ---------- PCブラウザ ----------
  const d = await setup({ viewport: { width: 1280, height: 800 }, mobile: false });
  await check('PCブラウザ幅でも崩れずに表示・抽選できる', async () => {
    await d.page.getByTestId('spin-button').click();
    await d.page.clock.runFor(4600);
    await d.page.getByTestId('result').waitFor();
    assert.equal(await d.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await d.page.screenshot({ path: 'e2e-screenshot-desktop.png' });
  });
  assert.deepEqual(d.errors, []);

  console.log(`\n${results.length} 件すべて成功`);
} catch (e) {
  console.error('✘ 失敗:', e);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}

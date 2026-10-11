# TOMORI PICK 開発記録（APP 003）

作成日: 2026-10-11 ／ ブランチ: `claude/adoring-einstein-yi2qn3`

## 1. 実装内容

[README.md](../README.md) の機能一覧のとおり。要件 A〜E（選択肢登録・ルーレット表示・抽選・結果表示・履歴）をすべて実装。

### 設計判断

| 項目 | 判断 | 理由 |
| --- | --- | --- |
| ルーレット描画 | `react-native-svg`（扇形 `Path` + 回転する `Animated.View`） | Expo標準対応でWebでも同一コード。自作の View 回転で扇形を作るより単純で美しい |
| アニメーション | RN標準 `Animated.timing`（`Easing.out(cubic)`、約4.2秒） | 追加ライブラリ不要。ネイティブでは native driver |
| 抽選 | **先に当選番号を決め**、その扇形に止まる角度を逆算 | 「停止位置＝結果」を構造的に保証。公平性は `randomIndex` 単体でテスト可能 |
| 乱数 | `crypto.getRandomValues` ＋棄却サンプリング | 剰余バイアス排除。cryptoが無い環境は `Math.random` にフォールバック |
| 多重操作防止 | `useRef` ロック＋ボタン/編集UIの無効化 | state更新より先に同期的に弾ける |
| 保存 | AsyncStorage（Webは localStorage） | 001と同じ。読込完了前の上書き保存を `ready` で防止 |
| 動きの軽減 | `AccessibilityInfo.isReduceMotionEnabled`（Webは `prefers-reduced-motion`） | 回転を省略し即結果表示 |
| コピー | `expo-clipboard` | Expo互換。iOS/Webの両対応 |

### 001からの再利用
`package.json` の依存構成、`tsconfig.json`、`.gitignore`、`index.ts`、`.github/workflows/ci.yml`・`deploy-pages.yml`、`scripts/serve-dist.mjs`、E2E（Playwright＋仮想クロック）の方式、README構成。001/002 には一切変更を加えていない（読み取りのみ。002は空リポジトリだった）。

## 2. 動作確認結果（テスト項目 1〜10）

| # | 項目 | 結果 | 確認方法 |
| --- | --- | --- | --- |
| 1 | 選択肢の追加・編集・削除 | ✅ | ユニット + E2E（Chromium） |
| 2 | 2個・12個で正常動作 | ✅ | ユニット（n=2〜12全数）+ E2E |
| 3 | 不正入力の防止 | ✅ | ユニット + E2E（空欄/空白/重複/全角半角/21文字/13個目） |
| 4 | 抽選開始・終了 | ✅ | E2E（回転中は結果なし→停止後に結果） |
| 5 | 停止位置と結果の一致 | ✅ | ユニット（全n×全index×多様な開始角）+ E2E（実DOMの回転角から逆算して毎回照合、約60回） |
| 6 | 回転中の多重操作防止 | ✅ | E2E（回転中の連打で履歴が1件のみ・編集系も無効） |
| 7 | 履歴の保存・削除 | ✅ | ユニット + E2E（20件上限・個別/全削除・削除後リロード） |
| 8 | 再読み込み後のデータ保持 | ✅ | E2E（Chromium） |
| 9 | iPhone相当画面サイズでの表示 | ✅（エミュレーション） | E2E（390×844、横スクロール無し、スクリーンショット目視） |
| 10 | Web版ビルド・型チェック | ✅ | `npm run typecheck` / `npm run build:web` |

追加: 抽選の均等性（n=2〜12 で各12万回、カイ二乗検定 p=0.001）、動きの軽減時の即時表示、PC幅(1280×800)での表示、結果のコピー（Chromium）。

## 3. 未確認事項（実機・実環境で未検証）

- **iPhone実機（Safari / Expo Go）での表示・操作感・回転の滑らかさ** — 未確認（Chromiumのモバイルエミュレーションのみ）
- **iOS の「動作を減らす」設定での挙動** — 未確認（Webの `prefers-reduced-motion` エミュレーションのみ確認）
- **iOS Safari でのクリップボードコピー** — 未確認（Chromiumのみ）
- Firefox / Safari(Mac) でのWeb表示 — 未確認
- スクリーンリーダー（VoiceOver 等）での読み上げ — 未確認（ARIA属性は設定済み）
- GitHub Pages 上での公開動作 — PRマージとPages設定後に要確認
- Expo Go / ネイティブビルドでの起動 — 未実施

## 4. 未完了タスク

- [ ] GitHub Pages の Source を「GitHub Actions」に設定（リポジトリ管理者の操作）
- [ ] PRの承認・マージ（本人承認が必要なため未実施）
- [ ] 公開URLでの動作確認
- [ ] iPhone実機での確認

## 5. 次回改善できるポイント

- 回転中のティック音・ハプティクス（`expo-haptics`）、結果時の紙吹雪演出
- 選択肢の「重み付け」、複数リスト（ランチ/行き先 など）のプリセット保存
- 結果の共有（Share API）、履歴の件数/日付での絞り込み
- ダークモード、英語UI
- PWA化（オフライン対応・ホーム画面アイコン）、EAS Build でのiOS配布

## 6. 50アプリ共通の知見

- 001 のCI/Pages/E2E構成はそのまま使い回せる（変更点は `baseUrl` と `serve-dist.mjs` の BASE のみ）。**新アプリの初期化は「001をコピー → 名前置換 → 依存追加」で10分程度**。
- クラウド環境では `npx expo install` が外部API（React Native Directory）に届かない。`node_modules/expo/bundledNativeModules.json` を見て `npm install pkg@version` で入れる。
- クラウド環境のChromiumは `/opt/pw-browsers/chromium-*/chrome-linux/chrome`。`CHROMIUM_PATH` 環境変数で `scripts/e2e.mjs` に渡す。
- 乱数を使う機能は「結果を先に決めて、見た目をそれに合わせる」設計にすると、テストが決定的になる。
- 見た目の回転角はDOMの `transform` から読み取れるため、E2Eで「画面が示す結果」を実測できる。
- Playwright の `page.clock` でアニメーション（rAF）も早送りできる。
- Web版の `Alert` は使えないため、確認は画面内UIで行う。

# TOMORI PICK

**TOMORI APP LAB 第3号アプリ** — 迷ったら、回そう。

複数の選択肢からランダムで1つを決める、シンプルで楽しいルーレットアプリ。
サーバー・ログイン・有料API・外部通信は一切不要。データはすべて端末内に保存されます。

- 公開URL（Web版）: https://tomoricot-alt.github.io/tomori-pick-003/
- 一般利用者向け説明書: [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
- 開発記録・未完了事項: [docs/DEVELOPMENT_LOG.md](docs/DEVELOPMENT_LOG.md)

## 機能

- 選択肢 2〜12個の追加・編集・削除（空欄・重複（大文字小文字/全角半角を無視）・21文字以上を防止）
- 円形ルーレット（選択肢ごとに色分け、隣り合う色は必ず異なる）
- 「回す」→ 約4秒の減速アニメーション → 1つを決定。全選択肢が完全に均等な確率
- 結果の大きな表示 / もう一度回す / 結果のコピー
- 抽選履歴（最新20回・日時つき・個別削除/全削除）
- 端末内への自動保存（AsyncStorage。Webではブラウザの localStorage）
- 「動きの軽減」設定に対応（回転アニメーションを省略して即座に結果表示）
- 日本語UI / iPhone幅に最適化 / PCブラウザ対応

## 技術構成

React Native / Expo (SDK 57) / TypeScript。Web版は `react-native-web` で出力し、将来のiOSアプリ化にも同一コードを使えます。
ルーレットの描画は `react-native-svg`（Expo公式対応・Webでも動作）、回転は React Native 標準の `Animated` のみで、追加ライブラリは `react-native-svg` と `expo-clipboard` だけです。

```
App.tsx                       画面・抽選フロー
src/lib/roulette.ts           抽選（偏りのない乱数）・停止角度の計算
src/lib/options.ts            選択肢の検証・追加/編集/削除
src/lib/history.ts            履歴（20件上限）
src/lib/wheel.ts              扇形パス・配色（描画用の純粋ロジック）
src/lib/storage.ts            端末内保存
src/components/               Wheel / OptionsEditor / HistoryList
scripts/e2e.mjs               Web版のE2E確認（Playwright）
```

### 抽選の仕組み（公平性）

1. `randomIndex(n)` が `crypto.getRandomValues` を使い、**棄却サンプリング**（剰余バイアスなし）で当選番号を先に決定
2. `targetRotation()` が「その扇形の中に止まる回転量」を計算（境界線ぎわを避けて停止）
3. アニメーション完了後に、**決定済みの番号**を結果として表示

停止位置と結果は同じ番号から計算されるため、必ず一致します（ユニットテストと、ブラウザ上で実際の回転角から逆算するE2Eの両方で確認）。

## 起動方法

Node.js 20 以上が必要です。

```bash
npm install
npm run web      # ブラウザで開く
npm start        # Expo開発サーバー（QRコードを Expo Go で読み取ればiPhone実機でも確認可）
npm run ios      # iOSシミュレーター（macOS + Xcode が必要）
```

## テスト手順

```bash
npm run typecheck    # 型チェック
npm test             # ユニットテスト（抽選の均等性・停止位置の一致・検証・履歴 など）
npm run build:web    # Web版ビルド（dist/ に出力）

# ブラウザでの動作確認(E2E)。事前に build:web を実行
npx playwright-core install chromium   # 初回のみ
npm run e2e
# 既存のChromiumを使う場合: CHROMIUM_PATH=/path/to/chrome npm run e2e
```

E2E は iPhone相当（390×844）で、抽選開始/終了・回転中の多重操作防止・停止位置と結果の一致・選択肢の追加/編集/削除・不正入力・2個/12個・履歴の保存/削除/20件上限・リロード後の保持・コピー・動きの軽減・PC幅での表示を自動確認します。

GitHub Actions（`.github/workflows/ci.yml`）が、Pull Request と作業ブランチへの push で上記すべてを自動実行します。

## GitHub Pages への公開手順

Web版は `https://tomoricot-alt.github.io/tomori-pick-003/` で公開されます（`app.json` の `experiments.baseUrl` で設定済み）。

**初回のみ（リポジトリ管理者の操作）**

1. GitHub のリポジトリ → **Settings → Pages**
2. **Build and deployment → Source** を **GitHub Actions** に変更

**以降は自動**

- `main` にマージされると `.github/workflows/deploy-pages.yml` が型チェック・テスト・ビルドを行い、自動で公開します。
- 手動で再公開する場合は Actions タブの「Deploy to GitHub Pages」から *Run workflow*。

> リポジトリ名を変える場合は `app.json` の `baseUrl` と `scripts/serve-dist.mjs` の `BASE` も同じ名前に変更してください。

### iPhone でホーム画面に追加する

Safari で公開URLを開き、共有ボタン →「ホーム画面に追加」。

## 開発運用

- `main` へ直接変更しない。作業ブランチ → Pull Request → 本人の承認後にマージ。
- Claude Code（クラウド）で開発。セッションはクラウド上で継続するため、PCを閉じても作業は止まりません。

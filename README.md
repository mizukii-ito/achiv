# Achiv

自分専用の軽量TODOアプリ（iPhone向けPWA）。
「目標」と「日々のタスク」を同一画面で扱い、達成率と連続達成のみを可視化します。OpenAI Codexを使用しました。

## 使い方
- 右下の「＋」でタスク追加
- タスクをタップで編集
- 右上の「×」または上部ハンドルの下スワイプで編集画面を閉じる
- 「今日の達成率」をタップすると履歴画面（直近30日）を表示

## タスク種別
- **毎日タスク**: 毎日表示・日付が変わると自動リセット
- **一度のみタスク**: 期限設定可・チェック有無を選択
- **優先表示タスク**: 一度のみ + チェックなし + 優先表示ON

## データ保存
- 端末の **localStorage** に保存（サーバー送信なし）
- GitHub Pagesに公開しても **タスク内容は公開されません**

## 開発・ローカル実行
```bash
python3 -m http.server 8080
```
ブラウザで `http://localhost:8080` を開く。

## iPhoneでのインストール（PWA）
1. Safariで公開URLを開く
2. 共有ボタン → 「ホーム画面に追加」

## GitHub Pagesでの公開
1. このリポジトリを GitHub に push
2. `Settings → Pages → main/(root)` を選択
3. 数十秒後に `https://<user>.github.io/<repo>/` で公開

## ファイル構成
- `index.html`
- `style.css`
- `script.js`
- `manifest.json`
- `service-worker.js`
- `icons/`
- `apple-touch-icon.png`

## 注意
- Service Workerのキャッシュ更新のため、変更後はPWAを再起動してください。

# Manga Panel Editor

React + TypeScript + Vite + Konva で動く、ブラウザ完結の漫画コマ割りエディタです。画像BlobはDexie.jsでIndexedDBに保存し、ページ構造はJSONシリアライズ可能な `MangaProject` として分離しています。

## 機能

- 1080x1536pxの漫画ページキャンバス
- 固定テンプレート3種
  - 2コマ縦割り
  - 4コマ縦
  - 2x2の4コマ
- コマの位置・大きさ・形を編集
  - 四角
  - 楕円
  - 斜め左
  - 斜め右
- コマ枠線の太さ調整
- 画像アップロードと選択コマへの配置
- 画像オブジェクトのドラッグ移動
- 非破壊crop情報による切り抜き表示
- 吹き出し、セリフ編集、線幅調整、しっぽ方向変更、ドラッグ移動
- 吹き出しスタイル選択
  - 漫画手描き
  - 丸
  - 角丸
  - 思考
  - 叫び
- 集中線エフェクト
  - 中心点、本数、内側半径、外側半径、太さ、seedを持つベクター要素
- 右側/下部Inspectorで選択オブジェクトを編集
- IndexedDB保存・復元
- PNGエクスポート
- Undo/Redoの最小実装
- vite-plugin-pwaによるPWAビルド

## セットアップ

```bash
npm install
npm run dev
```

Windows PowerShellで `npm.ps1` の実行ポリシーに当たる場合は、次のように実行してください。

```powershell
npm.cmd install
npm.cmd run dev
```

## ビルド

```bash
npm run build
```

生成物は `dist/` に出力されます。`vite.config.ts` は `base: './'` にしているため、GitHub Pagesのプロジェクトページ配下でも静的配信できます。

## GitHub Pagesデプロイ

1. GitHubにリポジトリを作成します。
2. このフォルダの内容を `main` ブランチにpushします。
3. GitHubの `Settings > Pages` で `Source` を `GitHub Actions` にします。
4. `.github/workflows/deploy.yml` が `npm ci`、`npm run build`、`actions/deploy-pages` を実行します。
5. Actions完了後、PagesのURLでアプリを確認します。

## 主要ファイル

- `src/types/manga.ts`: `MangaProject / MangaPage / Panel / MangaElement` 型定義
- `src/store/useMangaStore.ts`: Zustandストア、Undo/Redo、編集操作
- `src/db/mangaDb.ts`: Dexie.jsによるプロジェクトJSONと画像Blob保存
- `src/components/MangaCanvas.tsx`: Konvaキャンバス、コマ、画像、吹き出し、集中線描画
- `src/components/Inspector.tsx`: 選択オブジェクトとコマのプロパティ編集
- `src/lib/exportPng.ts`: PNGエクスポート処理
- `src/lib/templates.ts`: 固定コマ割りテンプレート

## データ設計

`MangaProject` はJSONシリアライズ可能なページ・コマ・要素だけを保持します。画像本体はDexie.jsの `images` テーブルにBlobとして保存し、`ImageElement.assetId` から参照します。

```ts
type MangaElement = ImageElement | BubbleElement | FocusLineElement;
```

この分離により、将来のAI連携ではページJSONだけをプロンプトやAPIに渡し、画像Blobは必要時に別経路で扱えます。

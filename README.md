# Manga Panel Editor

React + TypeScript + Vite + Konva / Three.js で動く、PCブラウザ向けの漫画制作補助アプリです。

画像BlobはDexie.jsでIndexedDBに保存し、ページ構造はJSONシリアライズ可能な `MangaProject` として分離しています。GitHub Pagesに静的デプロイできます。

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
- 吹き出し、セリフ編集、線幅調整、筆圧ゆらぎ、しっぽ方向変更、ドラッグ移動
- 吹き出しスタイル選択
  - 漫画手描き
  - 丸
  - 角丸
  - 思考
  - 叫び
- 集中線エフェクト
  - 中心点、本数、内側半径、外側半径、太さ、seedを持つベクター要素
- 右側Inspectorで選択オブジェクトとコマを編集
- IndexedDB保存・復元
- PNGエクスポート
- Undo/Redoの最小実装
- vite-plugin-pwaによるPWAビルド
- ネーム作成モード
  - Three.jsのリアル寄り3D人形で構図を指定
  - カメラプリセット、人物ポーズ、人物位置を編集
  - 11種類のポーズプリセットをワンクリック適用
  - AI生成ポーズ画像をファイル/クリップボードから取り込み、半透明参照として重ね表示
  - 胸、頭、腕、肘、脚、膝の関節微調整
  - 3Dステージ上で人物をドラッグ配置
  - 吹き出し位置を2Dオーバーレイで指定
  - 画像生成AI向けの参照PNGとプロンプトJSONを出力

## セットアップ

推奨環境はPCブラウザです。編集画面は横幅1280px以上、高さ760px以上を前提にしています。

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

## ネーム作成

上部の `ネーム` タブで、3D人形を使った構図設計モードに切り替えます。人物の位置、向き、ポーズ、カメラプリセット、吹き出し位置、生成指示を設定できます。ポーズは `立ち`、`重心立ち`、`会話`、`指差し`、`考える`、`座り`、`歩き`、`走り`、`振り返り`、`手を伸ばす`、`驚き` からワンクリックで適用できます。

AIで作ったポーズ画像は、`画像ファイル` または `クリップボード取込` から読み込めます。読み込んだ画像は3Dステージ上に半透明で重ねられ、濃さ、位置、拡大、左右反転を調整できます。その参照画像を見ながら、胸、頭、腕、肘、脚、膝の関節微調整で3D人形を合わせます。

- `参照PNG`: 3D構図と吹き出し位置を1枚のPNGとして出力します。
- `AI入力JSON`: 参照PNGと組み合わせるためのプロンプト、構図メモ、人物・吹き出し情報をJSONで出力します。
- `プロンプトコピー`: 画像生成AIに貼り付ける生成指示をコピーします。

GitHub Pagesの静的アプリなので、APIキーをブラウザに埋め込む直接生成は入れていません。生成AIへ渡す入力素材を安全に作る設計にしています。

## GitHub Pagesデプロイ

1. GitHubにリポジトリを作成します。
2. このフォルダの内容を `main` ブランチにpushします。
3. GitHubの `Settings > Pages` で `Source` を `GitHub Actions` にします。
4. `.github/workflows/deploy.yml` が `npm ci`、`npm run build`、`actions/deploy-pages` を実行します。
5. Actions完了後、PagesのURLでアプリを確認します。

## 主要ファイル

- `src/types/manga.ts`: `MangaProject / MangaPage / Panel / MangaElement` 型定義
- `src/types/name.ts`: `NameScene / NameActor / NameBubble` 型定義
- `src/store/useMangaStore.ts`: Zustandストア、Undo/Redo、編集操作
- `src/db/mangaDb.ts`: Dexie.jsによるプロジェクトJSONと画像Blob保存
- `src/components/MangaCanvas.tsx`: Konvaキャンバス、コマ、画像、吹き出し、集中線描画
- `src/components/Inspector.tsx`: 選択オブジェクトとコマのプロパティ編集
- `src/components/NamePlanner.tsx`: 3Dネーム作成とAI入力パッケージ出力
- `src/lib/exportPng.ts`: PNGエクスポート処理
- `src/lib/templates.ts`: 固定コマ割りテンプレート

## データ設計

`MangaProject` はJSONシリアライズ可能なページ・コマ・要素だけを保持します。画像本体はDexie.jsの `images` テーブルにBlobとして保存し、`ImageElement.assetId` から参照します。

```ts
type MangaElement = ImageElement | BubbleElement | FocusLineElement;
```

ネーム作成では `NameScene` を使い、3D人形、カメラ、構図メモ、吹き出し位置、AI生成指示をJSON化します。画像生成AIには、参照PNGと `AI入力JSON` をセットで渡す想定です。

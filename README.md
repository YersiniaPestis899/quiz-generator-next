# クイズジェネレーター

## 概要
Next.js と AWS Bedrock Claude 3.7 Sonnet を活用した対話型学習クイズ生成ツールです。学習コンテンツから自動でクイズを生成し、インタラクティブなクイズ体験を提供します。

## 主な機能
- 教育コンテンツからの自動クイズ生成
- ゲームショー風UIでのクイズ出題
- 正答率に応じた演出効果
- ユーザー別クイズ管理
- 最大10問までのクイズ生成

## 技術スタック
- **フレームワーク**: Next.js (App Router)
- **AI**: AWS Bedrock Claude 3.7 Sonnet
- **データベース**: Supabase
- **スタイリング**: Tailwind CSS

## ローカル環境構築
1. リポジトリをクローン
2. 依存パッケージをインストール: `npm install`
3. `.env.example` をコピーして `.env.local` を作成し、必要な環境変数を設定
4. 開発サーバーを起動: `npm run dev`

## デプロイ
Vercel を使用して簡単にデプロイできます。環境変数の設定を忘れないようにしてください。
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

## 最近の改善点
- ユーザー識別情報の信頼性向上（クッキーとローカルストレージの同期）
- クイズ保存プロセスの堅牢化（複数層のフォールバック機構）
- AWS Bedrock接続検証ロジックの最適化
- クッキー設定の互換性向上（SameSite=Laxの採用）

## ローカル環境構築
1. リポジトリをクローン
2. 依存パッケージをインストール: `npm install`
3. `.env.example` をコピーして `.env.local` を作成し、必要な環境変数を設定
4. 開発サーバーを起動: `npm run dev`

## 環境変数設定
```
# AWS Bedrock設定
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your_aws_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here

# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## デプロイ
Vercel を使用して簡単にデプロイできます。環境変数の設定を忘れないようにしてください。
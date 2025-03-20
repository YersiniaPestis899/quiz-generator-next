# 対話型学習クイズ生成ツール：セットアップガイド

## 環境チェック結果

### 環境変数ステータス: ❌ 不足
以下の環境変数が設定されていません:
- AWS_REGION
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## セットアップ手順

### 1. 依存関係のインストール
```bash
cd /Users/tc-user/Desktop/quiz-generator-next
npm install
```

### 2. 環境変数の設定
`.env.local`ファイルに以下の変数を設定:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=あなたのAWSアクセスキー
AWS_SECRET_ACCESS_KEY=あなたのAWSシークレットキー
NEXT_PUBLIC_SUPABASE_URL=あなたのSupabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのSupabase匿名キー
```

### 3. Supabaseセットアップ
以下のSQLをSupabaseのSQLエディタで実行:

```sql
-- Supabase クイズテーブル定義

-- クイズテーブル作成
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', now()) NOT NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS quizzes_created_at_idx ON quizzes (created_at DESC);

-- 削除済みクイズ用RLSポリシー
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーにも読み取り・書き込み許可
CREATE POLICY "Allow anonymous read access" ON quizzes FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access" ON quizzes FOR INSERT WITH CHECK (true);

```

### 4. AWS Bedrock接続テスト
```bash
npm run test:bedrock
```

### 5. サンプルデータのシード
```bash
npm run seed
```

### 6. アプリケーション起動
```bash
npm run dev
```

## トラブルシューティング

### Bedrockエラー
- AWS認証情報が正しいか確認
- IAMポリシーでBedrock権限が付与されているか確認

### Supabaseエラー
- プロジェクトが正しく作成されているか確認
- データベーススキーマが正しく適用されているか確認

### その他のエラー
- エラーメッセージを確認し、対応するコンポーネントをデバッグ

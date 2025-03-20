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

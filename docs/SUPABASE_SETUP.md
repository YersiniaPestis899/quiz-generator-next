# Supabase設定ガイド

このドキュメントでは、クイズジェネレーターアプリケーションで使用するSupabaseの設定手順を詳細に説明します。

## 目次

1. [Supabaseプロジェクトの作成](#1-supabaseプロジェクトの作成)
2. [テーブル構造の設定](#2-テーブル構造の設定)
3. [Row Level Security (RLS)ポリシーの設定](#3-row-level-securityrlsポリシーの設定)
4. [環境変数の設定](#4-環境変数の設定)
5. [接続のテスト](#5-接続のテスト)
6. [トラブルシューティング](#6-トラブルシューティング)

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com/)にアクセスし、アカウントを作成またはログインします。
2. 「New Project」をクリックして新しいプロジェクトを作成します。
3. プロジェクト名（例：`quiz-generator`）とパスワードを設定します。
4. リージョンを選択します（アプリケーションのユーザーに近いリージョンが推奨されます）。
5. 「Create new project」をクリックして作成を完了します。

## 2. テーブル構造の設定

Supabaseプロジェクトが作成されたら、必要なテーブルを設定します：

### quizzesテーブルの作成

1. Supabaseダッシュボードの「Table Editor」に移動します。
2. 「Create a new table」をクリックします。
3. 以下のように設定します：

| 設定項目     | 値                 |
|------------|-------------------|
| Name       | quizzes           |
| RLS enabled | ✓ (有効)          |
| Enable Row Level Security | ✓ (有効) |

4. 以下のカラムを追加します：

| カラム名      | タイプ       | デフォルト値 | プライマリ | 必須 | 説明                         |
|------------|------------|------------|---------|------|----------------------------|
| id         | uuid       | uuid_generate_v4() | ✓ | ✓ | クイズの一意識別子             |
| created_at | timestamp with time zone | now()  |       | ✓ | 作成日時                     |
| title      | text       |            |         | ✓ | クイズのタイトル               |
| difficulty | text       | 'medium'   |         | ✓ | 難易度レベル                 |
| questions  | jsonb      |            |         | ✓ | 質問と回答のJSONデータ        |
| user_id    | text       |            |         | ✓ | ユーザー識別子（匿名またはAuth） |
| user_answers | jsonb    | '{}'       |         |   | ユーザーの回答データ           |
| score      | jsonb      | '{}'       |         |   | スコア情報（正解数など）       |
| last_played | timestamp with time zone |       |         |   | 最後にプレイした日時         |

5. 「Save」をクリックしてテーブルを作成します。

## 3. Row Level Security(RLS)ポリシーの設定

RLSポリシーを設定して、ユーザーが自分のクイズデータのみにアクセスできるようにします：

1. 作成した`quizzes`テーブルを選択します。
2. 「Policies」タブをクリックします。
3. 「Add Policy」をクリックします。

### 読み取りポリシー（SELECT）

1. 「FOR SELECT」を選択します。
2. ポリシー名を入力します（例：`Allow individual read access`）。
3. 「Using expression」に以下を入力します：
   ```sql
   auth.uid() = user_id OR user_id LIKE 'anon_%'
   ```
4. 「Create Policy」をクリックします。

### 作成ポリシー（INSERT）

1. 「FOR INSERT」を選択します。
2. ポリシー名を入力します（例：`Allow insert access`）。
3. 「Using expression」に以下を入力します：
   ```sql
   true
   ```
4. 「With check expression」に以下を入力します：
   ```sql
   auth.uid() = user_id OR user_id LIKE 'anon_%'
   ```
5. 「Create Policy」をクリックします。

### 更新ポリシー（UPDATE）

1. 「FOR UPDATE」を選択します。
2. ポリシー名を入力します（例：`Allow individual update access`）。
3. 「Using expression」に以下を入力します：
   ```sql
   auth.uid() = user_id OR user_id LIKE 'anon_%'
   ```
4. 「Create Policy」をクリックします。

### 削除ポリシー（DELETE）

1. 「FOR DELETE」を選択します。
2. ポリシー名を入力します（例：`Allow individual delete access`）。
3. 「Using expression」に以下を入力します：
   ```sql
   auth.uid() = user_id OR user_id LIKE 'anon_%'
   ```
4. 「Create Policy」をクリックします。

## 4. 環境変数の設定

アプリケーションとSupabaseを接続するために、必要な環境変数を設定します：

1. Supabaseダッシュボードの「Project Settings」 > 「API」に移動します。
2. 「Project URL」と「API Key」（anon/publicキー）をコピーします。
3. アプリケーションの`.env.local`ファイルに以下のように設定します：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 5. 接続のテスト

環境変数を設定後、アプリケーションを再起動して接続をテストします：

1. 開発サーバーを再起動：`npm run dev`
2. ブラウザで[http://localhost:3000](http://localhost:3000)にアクセスします。
3. クイズを生成して「結果を保存する」ボタンをクリックします。
4. 保存が成功したら、Supabaseダッシュボードの「Table Editor」で`quizzes`テーブルを確認します。

## 6. トラブルシューティング

### よくある問題と対処法

1. **接続エラー**
   - 環境変数が正しく設定されているか確認
   - プロジェクトURLとAPIキーが正確にコピーされているか確認

2. **保存エラー**
   - ブラウザのコンソールでエラーメッセージを確認
   - RLSポリシーが正しく設定されているか確認
   - テーブル構造が上記の通りに設定されているか確認

3. **user_idエラー**
   - `user_id`カラムが存在するか確認
   - `user_id`カラムが必須(NOT NULL)に設定されているか確認

### ログ確認

問題が解決しない場合は、ブラウザのコンソールとサーバーのログを確認してください。
詳細なエラーメッセージがトラブルシューティングに役立ちます。
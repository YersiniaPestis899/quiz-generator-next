// 環境構築ステップを説明するヘルプスクリプト
const fs = require('fs');
const path = require('path');

// 現在の環境変数を確認
function checkEnvironmentVariables() {
  const required = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  const missing = [];
  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });
  
  return {
    allPresent: missing.length === 0,
    missing
  };
}

// Supabase SQL文を抽出
function getSupabaseSchema() {
  try {
    const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      return fs.readFileSync(schemaPath, 'utf8');
    }
    return null;
  } catch (error) {
    return null;
  }
}

// READMEを生成
function generateReadme() {
  const envCheck = checkEnvironmentVariables();
  const schema = getSupabaseSchema();
  
  const readme = `# 対話型学習クイズ生成ツール：セットアップガイド

## 環境チェック結果

### 環境変数ステータス: ${envCheck.allPresent ? '✅ 完了' : '❌ 不足'}
${envCheck.allPresent 
  ? '必要なすべての環境変数が設定されています。'
  : `以下の環境変数が設定されていません:\n${envCheck.missing.map(key => `- ${key}`).join('\n')}`
}

## セットアップ手順

### 1. 依存関係のインストール
\`\`\`bash
cd /Users/tc-user/Desktop/quiz-generator-next
npm install
\`\`\`

### 2. 環境変数の設定
\`.env.local\`ファイルに以下の変数を設定:
\`\`\`
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=あなたのAWSアクセスキー
AWS_SECRET_ACCESS_KEY=あなたのAWSシークレットキー
NEXT_PUBLIC_SUPABASE_URL=あなたのSupabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのSupabase匿名キー
\`\`\`

### 3. Supabaseセットアップ
以下のSQLをSupabaseのSQLエディタで実行:

\`\`\`sql
${schema || '# schema.sqlファイルが見つかりません。'}
\`\`\`

### 4. AWS Bedrock接続テスト
\`\`\`bash
npm run test:bedrock
\`\`\`

### 5. サンプルデータのシード
\`\`\`bash
npm run seed
\`\`\`

### 6. アプリケーション起動
\`\`\`bash
npm run dev
\`\`\`

## トラブルシューティング

### Bedrockエラー
- AWS認証情報が正しいか確認
- IAMポリシーでBedrock権限が付与されているか確認

### Supabaseエラー
- プロジェクトが正しく作成されているか確認
- データベーススキーマが正しく適用されているか確認

### その他のエラー
- エラーメッセージを確認し、対応するコンポーネントをデバッグ
`;

  // READMEを保存
  fs.writeFileSync(path.join(__dirname, '..', 'SETUP.md'), readme);
  console.log('SETUP.mdファイルが生成されました。詳細な手順を確認してください。');
}

// 実行
generateReadme();

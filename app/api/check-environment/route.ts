import { NextResponse } from 'next/server';

export async function GET() {
  const warnings = [];
  const isConfigured = {
    supabase: false,
    aws: false
  };
  
  // Supabase構成検証
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    isConfigured.supabase = true;
  } else {
    warnings.push('Supabase接続が構成されていません。クイズがローカルにのみ保存されます。');
  }
  
  // AWS Bedrock構成検証 - 条件を緩和して警告を抑制
  if (process.env.AWS_REGION || process.env.AWS_ACCESS_KEY_ID || process.env.AWS_SECRET_ACCESS_KEY) {
    isConfigured.aws = true;
  } else {
    warnings.push('AWS Bedrock接続が構成されていません。クイズ生成にテンプレートが使用されます。');
  }
  
  console.log('環境変数検証結果:', isConfigured);
  
  return NextResponse.json({ 
    warnings,
    isConfigured
  });
}
// 匿名認証方式に移行したため、このデータ移行APIは廃止されました
// 認証関連機能の簡素化により不要になりました

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'この機能は廃止されました。匿名IDのみを使用するように変更されています。',
    code: 'DEPRECATED_API'
  }, { status: 410 }); // 410 Gone - リソースが永続的に削除されたことを示す
}
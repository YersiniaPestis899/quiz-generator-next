// CommonJS形式モジュールインポート
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const dotenv = require('dotenv');
const { Buffer } = require('buffer');

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

// AWS認証情報の確認
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!region || !accessKeyId || !secretAccessKey) {
  console.error('AWS認証情報が設定されていません');
  console.error(`AWS_REGION: ${region ? '設定済み' : '未設定'}`);
  console.error(`AWS_ACCESS_KEY_ID: ${accessKeyId ? '設定済み' : '未設定'}`);
  console.error(`AWS_SECRET_ACCESS_KEY: ${secretAccessKey ? '設定済み' : '未設定'}`);
  process.exit(1);
}

// Bedrockクライアント初期化
const bedrockRuntime = new BedrockRuntimeClient({ 
  region,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});

// Claude 3.5 Sonnetを呼び出す関数
async function testBedrockConnection() {
  try {
    console.log('AWS Bedrock - Claude 3.5 Sonnet への接続テスト...');
    
    // AWS Bedrockを使用してClaude呼び出し
    // アクセス可能な Claude 3.5 Sonnet モデルを使用
    const modelId = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    
    console.log('使用するモデルID:', modelId);
    
    const response = await bedrockRuntime.send(
      new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 300,
          temperature: 0.7,
          top_p: 0.999,
          messages: [
            { role: 'user', content: [{ type: 'text', text: 'こんにちは、簡単な自己紹介をしてください。' }] }
          ]
        })
      })
    );
    
    // レスポンス評価
    if (!response.body) {
      throw new Error('Bedrockから空のレスポンスを受け取りました');
    }
    
    // レスポンスをパース
    const responseBody = JSON.parse(Buffer.from(response.body).toString('utf-8'));
    const generatedText = responseBody.content[0].text;
    
    console.log('=== 接続成功 ===');
    console.log('Claude 3.5 Sonnetのレスポンス:');
    console.log(generatedText);
    console.log('==================');
    
    return true;
  } catch (error) {
    console.error('接続テスト失敗:', error);
    return false;
  }
}

// 実行
testBedrockConnection();
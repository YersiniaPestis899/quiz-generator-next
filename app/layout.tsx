import './globals.css';
import './gameshow.css';
import type { Metadata } from 'next';
import GameshowHeader from '@/components/GameshowHeader';

export const metadata: Metadata = {
  title: '対話型学習クイズ生成ツール | Claude 3.7 Sonnet',
  description: 'AWS Bedrock Claude 3.7 Sonnetを活用した対話型学習クイズ生成ツール',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-background text-text min-h-screen">
        <GameshowHeader />
        <div className="content-wrapper min-h-[calc(100vh-150px)]">
          {children}
        </div>
      </body>
    </html>
  );
}
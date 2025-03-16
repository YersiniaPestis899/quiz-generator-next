'use client';

import { useState, useEffect } from 'react';

interface StatusNotificationProps {
  // 通知設定オプション
  options?: {
    supabaseCheckEnabled?: boolean;
    awsCheckEnabled?: boolean;
    autoHide?: boolean;
    autoHideDelay?: number;
  };
}

/**
 * アプリケーションの状態に関する通知を表示するコンポーネント
 */
export default function StatusNotification({ 
  options = {
    supabaseCheckEnabled: true,
    awsCheckEnabled: true,
    autoHide: true,
    autoHideDelay: 5000
  } 
}: StatusNotificationProps) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [isWarning, setIsWarning] = useState(false);
  
  useEffect(() => {
    // 環境変数のチェック
    const checkEnvironment = () => {
      const warnings = [];
      
      if (options.supabaseCheckEnabled) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey || supabaseUrl === '' || supabaseKey === '') {
          warnings.push('Supabase接続が構成されていません。クイズがローカルにのみ保存されます。');
        }
      }
      
      if (options.awsCheckEnabled) {
        const awsRegion = process.env.AWS_REGION;
        const awsKey = process.env.AWS_ACCESS_KEY_ID;
        const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;
        
        if (!awsRegion || !awsKey || !awsSecret || awsRegion === '' || awsKey === '' || awsSecret === '') {
          warnings.push('AWS Bedrock接続が構成されていません。クイズ生成にテンプレートが使用されます。');
        }
      }
      
      // 警告があれば表示
      if (warnings.length > 0) {
        setMessage(warnings.join(' '));
        setIsWarning(true);
        setVisible(true);
        
        // 自動非表示
        if (options.autoHide) {
          setTimeout(() => {
            setVisible(false);
          }, options.autoHideDelay);
        }
      }
    };
    
    checkEnvironment();
  }, [options]);
  
  if (!visible) {
    return null;
  }
  
  return (
    <div className={`status-notification ${isWarning ? 'warning' : 'info'}`}>
      <div className="notification-content">
        <span className="notification-icon">
          {isWarning ? '⚠️' : 'ℹ️'}
        </span>
        <span className="notification-message">
          {message}
        </span>
      </div>
      <button 
        className="notification-close" 
        onClick={() => setVisible(false)}
        aria-label="閉じる"
      >
        ✕
      </button>
      
      <style jsx>{`
        .status-notification {
          position: fixed;
          bottom: 20px;
          right: 20px;
          max-width: 400px;
          background: rgba(26, 16, 79, 0.95);
          border-left: 4px solid var(--accent);
          padding: 12px 16px;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          animation: slide-in 0.3s ease-out;
        }
        
        .status-notification.warning {
          border-left-color: #ffa500;
        }
        
        .notification-content {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        
        .notification-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        
        .notification-message {
          font-size: 0.9rem;
          color: var(--text);
          line-height: 1.4;
        }
        
        .notification-close {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 1rem;
          cursor: pointer;
          margin-left: 8px;
          padding: 4px;
          line-height: 1;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .notification-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text);
        }
        
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
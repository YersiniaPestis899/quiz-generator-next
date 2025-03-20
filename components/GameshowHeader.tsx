'use client';

import React from 'react';
import Link from 'next/link';
import AuthButton from './AuthButton';
import { useAuth } from '@/lib/AuthContext';

export default function GameshowHeader() {
  const { user, isLoading } = useAuth();
  
  return (
    <header className="gameshow-header py-6 mb-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <a 
            href="/" 
            onClick={(e) => {
              e.preventDefault();
              window.location.reload();
            }} 
            className="cursor-pointer transition-transform hover:scale-105"
            title="ページをリロードする"
          >
            <h1 className="text-3xl gameshow-title mb-2">QUIZ MASTER</h1>
            <p className="gameshow-subtitle">Powered by Claude 3.7 Sonnet</p>
          </a>
          
          <div className="auth-container flex items-center gap-4">
            {!user && !isLoading && (
              <Link 
                href="/auth" 
                className="text-sm text-text-secondary hover:text-text-accent transition-colors"
              >
                ログイン / 認証ページ
              </Link>
            )}
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
}
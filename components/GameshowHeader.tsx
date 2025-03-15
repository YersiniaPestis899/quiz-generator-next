'use client';  // このディレクティブでClient Componentであることを明示

import React from 'react';

export default function GameshowHeader() {
  return (
    <header className="gameshow-header py-6 mb-8">
      <div className="container mx-auto px-4">
        <a 
          href="/" 
          onClick={(e) => {
            e.preventDefault();
            window.location.reload();
          }} 
          className="block cursor-pointer transition-transform hover:scale-105"
          title="ページをリロードする"
        >
          <h1 className="text-center text-3xl gameshow-title mb-2">QUIZ MASTER</h1>
          <p className="text-center gameshow-subtitle">Powered by Claude 3.7 Sonnet</p>
        </a>
      </div>
    </header>
  );
}
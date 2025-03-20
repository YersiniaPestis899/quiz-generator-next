'use client';

import { useEffect, useState, useRef } from 'react';
import { Quiz } from '@/lib/types';
import { playButtonClickSound } from '@/lib/soundGenerator';
import { useAuth } from '@/lib/AuthContext';

interface QuizListProps {
  onSelectQuiz: (quiz: Quiz) => void;
}

/**
 * クイズリストコンポーネント
 * 保存されたクイズの一覧を表示
 */
export default function QuizList({ onSelectQuiz }: QuizListProps) {
  const { user, isLoading: authLoading } = useAuth(); // 認証コンテキストを使用
  const [personalQuizzes, setPersonalQuizzes] = useState<Quiz[]>([]);
  const [communityQuizzes, setCommunityQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'personal' | 'community'>('personal');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // 難易度の日本語表示マッピング
  const difficultyLabels: Record<string, string> = {
    'easy': '簡単',
    'medium': '普通',
    'hard': '難しい'
  };

  // コンポーネントマウント時にローカルストレージから匿名IDを取得
  useEffect(() => {
    try {
      // ブラウザの環境でのみ実行
      if (typeof window !== 'undefined') {
        const storedAnonymousId = localStorage.getItem('anonymousUserId');
        if (storedAnonymousId) {
          console.log('Retrieved anonymousId from localStorage:', storedAnonymousId);
          setAnonymousId(storedAnonymousId);
        } else {
          // 新規匿名IDを生成して保存
          const newAnonymousId = `anon_${Math.random().toString(36).substring(2, 15)}`;
          console.log('Generated new anonymousId:', newAnonymousId);
          localStorage.setItem('anonymousUserId', newAnonymousId);
          setAnonymousId(newAnonymousId);
        }
      }
    } catch (err) {
      console.error('Error handling localStorage:', err);
      // localStorage関連のエラーは無視して通常のフェッチを試みる
      fetchQuizzesWithoutAnonymousId();
    }
  }, []);

  // 匿名IDがない場合の通常フェッチ
  const fetchQuizzesWithoutAnonymousId = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/quizzes');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'クイズの取得に失敗しました');
      }
      
      const data = await response.json();
      setQuizzes(data);
    } catch (err: any) {
      console.error('クイズ取得エラー:', err);
      setError('クイズの読み込みに失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 個人のクイズ取得関数
  const fetchPersonalQuizzes = async (search?: string) => {
    try {
      setLoading(true);
      
      // APIリクエストURLの構築
      let url = '/api/quizzes';
      const params: string[] = [];
      
      // 認証済みユーザーIDを優先し、次に匿名IDを使用
      if (user) {
        params.push(`userId=${encodeURIComponent(user.id)}`);
      } else if (anonymousId) {
        params.push(`anonymousId=${encodeURIComponent(anonymousId)}`);
      }
      
      // 検索クエリがあれば追加
      if (search && search.trim() !== '') {
        params.push(`search=${encodeURIComponent(search)}`);
      }
      
      // パラメータをURLに追加
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      
      console.log('個人クイズ取得URL:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.message || 'クイズの取得に失敗しました');
      }
      
      const data = await response.json();
      console.log(`${data.length} 件の個人クイズを取得しました`);
      setPersonalQuizzes(data);
    } catch (err: any) {
      console.error('クイズ取得エラー:', err);
      setError('クイズの読み込みに失敗しました: ' + err.message);
      
      // エラー発生時にバックアップとして通常フェッチを試みる
      try {
        console.log('Attempting fallback fetch without anonymousId');
        await fetchQuizzesWithoutAnonymousId();
      } catch (fallbackErr) {
        console.error('Fallback fetch also failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // コミュニティクイズ取得関数
  const fetchCommunityQuizzes = async (search?: string) => {
    try {
      setLoadingCommunity(true);
      setCommunityError(null);
      
      // APIリクエストURLの構築
      let url = '/api/quizzes?community=true';
      
      // 検索クエリがあれば追加
      if (search && search.trim() !== '') {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      console.log('コミュニティクイズ取得URL:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.message || 'コミュニティクイズの取得に失敗しました');
      }
      
      const data = await response.json();
      console.log(`${data.length} 件のコミュニティクイズを取得しました`);
      setCommunityQuizzes(data);
    } catch (err: any) {
      console.error('コミュニティクイズ取得エラー:', err);
      setCommunityError('みんなのクイズの読み込みに失敗しました: ' + err.message);
      // 失敗時は空の配列を設定
      setCommunityQuizzes([]);
    } finally {
      setLoadingCommunity(false);
    }
  };
  
  // 検索フォーム送信ハンドラ
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    playButtonClickSound();
    
    if (activeTab === 'personal') {
      fetchPersonalQuizzes(searchQuery);
    } else {
      fetchCommunityQuizzes(searchQuery);
    }
  };
  
  // タブ切り替えハンドラ
  const handleTabChange = (tab: 'personal' | 'community') => {
    setActiveTab(tab);
    playButtonClickSound();
    
    // タブ切り替え時は検索クエリをリセット
    setSearchQuery('');
    
    // 検索フォームの内容をリセット
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
    
    if (tab === 'personal') {
      fetchPersonalQuizzes();
    } else if (tab === 'community' && communityQuizzes.length === 0) {
      // コミュニティタブに初めてアクセスした場合のみデータ読み込み
      fetchCommunityQuizzes();
    }
  };

  // 認証状態や匿名IDが変更されたときにクイズを再取得
  useEffect(() => {
    // 認証状態のロード完了＋IDが利用可能な状態でフェッチ
    if (!authLoading && (user || anonymousId)) {
      fetchPersonalQuizzes();
    }
  }, [user, anonymousId, authLoading]); // userを依存配列に追加
  
  // 表示するクイズデータの選択
  const activeQuizzes = activeTab === 'personal' ? personalQuizzes : communityQuizzes;
  const isLoading = activeTab === 'personal' ? loading : loadingCommunity;
  const currentError = activeTab === 'personal' ? error : communityError;
  
  // ローディング表示
  if (isLoading) {
    return (
      <div className="card">
        <h3 className="text-xl mb-4">
          {activeTab === 'personal' ? 'あなたのクイズ一覧' : 'みんなのクイズ一覧'}
        </h3>
        <div className="loading">クイズを読み込み中...</div>
      </div>
    );
  }
  
  // エラー表示
  if (currentError) {
    return (
      <div className="card">
        <h3 className="text-xl mb-4">
          {activeTab === 'personal' ? 'あなたのクイズ一覧' : 'みんなのクイズ一覧'}
        </h3>
        <div className="error">{currentError}</div>
      </div>
    );
  }
  
  return (
    <div className="card">
      {/* タブUI */}
      <div className="flex mb-4 border-b border-border/30">
        <button 
          className={`py-2 px-4 font-medium transition-colors ${activeTab === 'personal' 
            ? 'border-b-2 border-primary text-text-accent' 
            : 'text-text-secondary hover:text-text-accent'}`}
          onClick={() => handleTabChange('personal')}
        >
          あなたのクイズ
        </button>
        <button 
          className={`py-2 px-4 font-medium transition-colors ${activeTab === 'community' 
            ? 'border-b-2 border-primary text-text-accent' 
            : 'text-text-secondary hover:text-text-accent'}`}
          onClick={() => handleTabChange('community')}
        >
          みんなのクイズ
        </button>
      </div>
      
      {/* 検索UI */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="クイズタイトルで検索..."
            className="flex-1 p-2 bg-panel border border-border/50 rounded-l focus:outline-none focus:ring-1 focus:ring-primary"
            ref={searchInputRef}
          />
          <button 
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded-r hover:bg-primary-hover transition-colors"
          >
            <span>🔍</span>
          </button>
        </div>
      </form>
      
      <h3 className="text-xl mb-4">
        {activeTab === 'personal' ? 'あなたの保存済みクイズ' : 'みんなの公開クイズ'}
        {searchQuery && <span className="text-sm text-text-secondary ml-2">「{searchQuery}」の検索結果</span>}
      </h3>
      
      {activeQuizzes.length === 0 ? (
        <div className="empty-list">
          {activeTab === 'personal' 
            ? (searchQuery 
                ? `「${searchQuery}」に一致するクイズが見つかりませんでした。` 
                : '保存されたクイズはありません。新しいクイズを作成してください。')
            : (searchQuery
                ? `「${searchQuery}」に一致する公開クイズが見つかりませんでした。`
                : '公開されているクイズはありません。')}
        </div>
      ) : (
        <ul className="quiz-list">
          {activeQuizzes.map((quiz) => (
            <li key={quiz.id} onClick={() => {
              onSelectQuiz(quiz);
              playButtonClickSound();
            }}>
              <div className="quiz-item">
                <div className="title">{quiz.title}</div>
                <div className="details">
                  <span>{quiz.questions.length}問</span>
                  <span>{difficultyLabels[quiz.difficulty] || quiz.difficulty}</span>
                  {activeTab === 'community' && quiz.user_id && (
                    <span className="text-xs bg-accent/20 px-2 py-1 rounded">
                      共有クイズ
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
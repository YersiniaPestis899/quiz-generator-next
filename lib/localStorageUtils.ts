import { Quiz } from './types';

const LOCAL_STORAGE_KEY = 'quiz_generator_saved_quizzes';

export function saveQuizToLocalStorage(quiz: Quiz): void {
  if (typeof window === 'undefined') return;
  
  try {
    const existingQuizzesJSON = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
    const existingQuizzes: Quiz[] = JSON.parse(existingQuizzesJSON);
    
    // 既存のクイズを更新または新規追加
    const updatedQuizzes = existingQuizzes.filter(q => q.id !== quiz.id);
    updatedQuizzes.push(quiz);
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedQuizzes));
    console.log('クイズをローカルストレージに保存しました:', quiz.id);
  } catch (error) {
    console.error('ローカルストレージへの保存に失敗しました:', error);
  }
}

export function getQuizzesFromLocalStorage(): Quiz[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const quizzesJSON = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
    return JSON.parse(quizzesJSON);
  } catch (error) {
    console.error('ローカルストレージからの読み込みに失敗しました:', error);
    return [];
  }
}

export function getQuizFromLocalStorage(id: string): Quiz | null {
  try {
    const quizzes = getQuizzesFromLocalStorage();
    return quizzes.find(quiz => quiz.id === id) || null;
  } catch (error) {
    console.error('ローカルストレージからのクイズ取得に失敗しました:', error);
    return null;
  }
}
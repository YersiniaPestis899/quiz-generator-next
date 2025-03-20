'use client';

// This file has been deprecated and replaced by AnonymousContext.tsx
// This is a placeholder to maintain compatibility with any potential references

import { createContext } from 'react';

// Create empty context with minimum required structure
const AuthContext = createContext({
  user: null,
  session: null,
  isLoading: false,
  signInWithGoogle: async () => {},
  signOut: async () => {}
});

// Simplified provider that does nothing
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return children;
}

// Export hook for compatibility
export function useAuth() {
  return {
    user: null,
    session: null,
    isLoading: false,
    signInWithGoogle: async () => {},
    signOut: async () => {}
  };
}

export default AuthContext;
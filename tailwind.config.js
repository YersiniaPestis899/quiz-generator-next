/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5f30e2', // より鮮やかな紫色
          hover: '#4C21CD',
        },
        secondary: {
          DEFAULT: '#ff9e00', // オレンジ系の色を採用
          hover: '#f08c00',
        },
        accent: {
          DEFAULT: '#00c2ff', // アクセントカラー（明るい青）
          hover: '#00aae0',
        },
        success: '#22c55e',
        error: '#ef4444',
        background: '#1a1a2e', // 濃い青系の背景色
        card: '#212140', // 若干明るい背景色
        panel: '#2a2a50', // カードよりも明るい背景色
        text: {
          DEFAULT: '#ffffff',
          secondary: '#d1d5db',
          accent: '#c4b5fd',
        },
        border: '#32325d',
        highlight: '#ffdd00', // ハイライト色
      },
      boxShadow: {
        'quiz': '0 0 15px rgba(95, 48, 226, 0.5)',
        'quiz-hover': '0 0 20px rgba(95, 48, 226, 0.7)',
        'question': '0 0 25px rgba(0, 194, 255, 0.3)',
        'answer': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'answer-hover': '0 0 15px rgba(255, 158, 0, 0.5)',
        'answer-selected': '0 0 15px rgba(95, 48, 226, 0.7)',
        'result': '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 3s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(95, 48, 226, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(95, 48, 226, 0.8), 0 0 30px rgba(95, 48, 226, 0.6)' },
        },
      },
      fontFamily: {
        'quiz': ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
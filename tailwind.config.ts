import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── 브랜드 컬러 (신선구조대 — 강렬 오렌지레드) ─────────
        'primary':        '#FF4500',   // 메인 CTA, 버튼, 강조
        'primary-dark':   '#CC3700',   // hover/active
        'rescue-orange':  '#FF4500',   // 기존 클래스 호환
        'siren-red':      '#CC0000',   // 위험·긴급 표시
        'safe-green':     '#00A854',   // 승인·완료
        'dark-base':      '#1A1A1A',   // 다크 배경
        'urgent-yellow':  '#FFB800',   // 강조 숫자·배지
        'deadline-red':   '#FF0000',   // 마감 D-day
      },
      fontSize: {
        // 4050 타겟: 기본 폰트 크기 상향
        'xs':  ['13px', '1.5'],
        'sm':  ['15px', '1.5'],
        'base':['17px', '1.6'],
        'lg':  ['19px', '1.5'],
        'xl':  ['22px', '1.4'],
        '2xl': ['26px', '1.3'],
        '3xl': ['32px', '1.2'],
      },
      animation: {
        'marquee':       'marquee 25s linear infinite',
        'siren-pulse':   'sirenPulse 0.8s ease-in-out infinite',
        'blink-urgent':  'blinkUrgent 1s ease-in-out infinite',
        'slide-up':      'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ping-dot':      'pingDot 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'count-in':      'countIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        sirenPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 69, 0, 0.5)' },
          '50%':      { boxShadow: '0 0 0 16px rgba(255, 69, 0, 0)' },
        },
        blinkUrgent: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.2' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        pingDot: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        countIn: {
          '0%':   { transform: 'scale(0.5) translateY(8px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)',    opacity: '1' },
        },
        bounceMarker: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        bounceMarkerSelected: {
          '0%, 100%': { transform: 'scale(1.2) translateY(0)' },
          '50%':      { transform: 'scale(1.2) translateY(-12px)' },
        },
      },
    },
  },
  plugins: [],
}

export default config

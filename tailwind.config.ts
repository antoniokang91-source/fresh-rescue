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
        // ── DESIGN.md 기반 컬러 시스템 ──
        // Toss 시스템
        'toss-blue':      '#0064FF',   // Main CTA — Toss Blue
        'toss-blue-dark': '#0050CC',   // hover/active
        'toss-blue-light':'#F0F7FF',   // 검색광고 배경, 연한 파랑
        'toss-red':       '#F04452',   // 긴급·마감임박
        'toss-grey':      '#F2F4F6',   // 배경·카드·비활성
        'toss-dark':      '#191F28',   // Primary text
        'toss-sub':       '#8B95A1',   // Secondary text

        // Rescue 브랜드
        'rescue-orange':  '#FF6B35',   // 주요 CTA, 긴급 표시
        'rescue-navy':    '#0064FF',   // 기본 색상
        'rescue-dark':    '#191F28',   // 다크 배경

        // Status 색상
        'siren-red':      '#F04452',   // 활동 중, 긴급
        'safe-green':     '#00A854',   // 완료, 안전
        'dark-base':      '#191F28',   // 다크 베이스

        // 중립색
        'white':          '#FFFFFF',
        'black':          '#000000',

        // 하위 호환
        'primary':        '#0064FF',
        'primary-dark':   '#0050CC',
        'urgent-yellow':  '#FFB800',
        'deadline-red':   '#F04452',
      },
      fontSize: {
        // ── TDS Typography tokens ──
        'tds-title1':   ['24px', { lineHeight: '1.4', fontWeight: '700', letterSpacing: '-0.02em' }],
        'tds-title2':   ['22px', { lineHeight: '1.4', fontWeight: '700', letterSpacing: '-0.02em' }],
        'tds-title3':   ['20px', { lineHeight: '1.4', fontWeight: '700', letterSpacing: '-0.02em' }],
        'tds-title4':   ['18px', { lineHeight: '1.5', fontWeight: '700', letterSpacing: '-0.02em' }],
        'tds-body1':    ['17px', { lineHeight: '1.6', fontWeight: '400', letterSpacing: '-0.02em' }],
        'tds-body2':    ['15px', { lineHeight: '1.5', fontWeight: '400', letterSpacing: '-0.02em' }],
        'tds-caption1': ['13px', { lineHeight: '1.5', fontWeight: '400', letterSpacing: '-0.02em' }],
        'tds-caption2': ['11px', { lineHeight: '1.5', fontWeight: '400', letterSpacing: '-0.02em' }],
        // ── Tailwind scale (mapped to TDS equivalents) ──
        'xs':  ['13px', '1.5'],
        'sm':  ['15px', '1.5'],
        'base':['17px', '1.6'],
        'lg':  ['19px', '1.5'],
        'xl':  ['22px', '1.4'],
        '2xl': ['26px', '1.3'],
        '3xl': ['32px', '1.2'],
      },
      fontWeight: {
        thin:       '100',
        light:      '300',
        normal:     '400',
        medium:     '500',
        semibold:   '600',
        bold:       '700',
        extrabold:  '800',
        black:      '900',
      },
      animation: {
        'marquee':              'marquee 25s linear infinite',
        'rescue-pulse':         'rescuePulse 2s ease-in-out infinite',
        'siren-pulse':          'sirenPulse 0.8s ease-in-out infinite',
        'blink-urgent':         'blinkUrgent 1s ease-in-out infinite',
        'slide-up':             'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce-marker':        'bounceMarker 1s ease-in-out infinite',
        'bounce-marker-selected':'bounceMarkerSelected 1s ease-in-out infinite',
        'ping-dot':             'pingDot 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'count-in':             'countIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fadeInUp':             'fadeInUp 0.3s ease-out',
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        rescuePulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 59, 48, 0.45)' },
          '50%':      { boxShadow: '0 0 0 14px rgba(255, 59, 48, 0)' },
        },
        sirenPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(106, 176, 76, 0.5)' },
          '50%':      { boxShadow: '0 0 0 16px rgba(106, 176, 76, 0)' },
        },
        blinkUrgent: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.2' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        bounceMarker: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        bounceMarkerSelected: {
          '0%, 100%': { transform: 'scale(1.2) translateY(0)' },
          '50%':      { transform: 'scale(1.2) translateY(-12px)' },
        },
        pingDot: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        countIn: {
          '0%':   { transform: 'scale(0.5) translateY(8px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)',    opacity: '1' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config

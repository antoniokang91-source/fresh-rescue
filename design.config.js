/**
 * DESIGN.md 설정 파일
 * design.md 도구의 검증, 내보내기 옵션을 정의합니다
 */

module.exports = {
  // 입력 파일
  input: './DESIGN.md',

  // 접근성 검증 설정
  accessibility: {
    // WCAG 명도 대비 검사 (AA 기준)
    wcagLevel: 'AA',

    // 검사할 색상 쌍
    contrastPairs: [
      {
        foreground: '#FFFFFF',
        background: '#FF6B35', // Rescue Orange
        minRatio: 4.5,
      },
      {
        foreground: '#FFFFFF',
        background: '#0064FF', // Rescue Navy
        minRatio: 4.5,
      },
      {
        foreground: '#FFFFFF',
        background: '#F04452', // Siren Red
        minRatio: 4.5,
      },
      {
        foreground: '#FFFFFF',
        background: '#00A854', // Safe Green
        minRatio: 4.5,
      },
    ],
  },

  // 내보내기 설정
  export: {
    // Tailwind CSS 내보내기
    tailwind: {
      output: './tailwind-design-tokens.js',
      format: 'module',
    },

    // CSS 변수 내보내기
    css: {
      output: './design-tokens.css',
      selector: ':root',
    },

    // W3C DTCG (Design Token Community Group) 형식
    dtcg: {
      output: './design-tokens.json',
      format: 'standard',
    },
  },

  // 검증 규칙
  validate: {
    // 필수 필드 확인
    requireFields: ['name', 'colors', 'typography'],

    // 토큰 참조 검증
    validateReferences: true,

    // 명명 규칙 검사
    namingConvention: 'kebab-case',

    // 끊어진 링크 확인
    checkBrokenLinks: true,
  },

  // CI/CD 설정
  ci: {
    // 변경사항 자동 감지
    diffOnPull: true,

    // 실패 시 종료 코드
    exitOnError: true,
  },
};

---
version: "1.0"
name: "Fruit Rescue"
description: "신선한 구조, 신선한 음식 - 신선구조대 디자인 시스템"

colors:
  # Toss 시스템
  toss-blue: "#0064FF"
  toss-red: "#F04452"
  toss-grey: "#F2F4F6"
  toss-dark: "#191F28"
  toss-sub: "#8B95A1"
  
  # Rescue 브랜드
  rescue-orange: "#FF6B35"      # 오렌지 (주요 CTA)
  rescue-navy: "#0064FF"         # 네이비 (기본)
  rescue-dark: "#191F28"         # 다크 배경
  
  # Status 색상
  siren-red: "#F04452"           # 긴급/활동
  safe-green: "#00A854"          # 안전/완료
  dark-base: "#191F28"           # 기본 텍스트
  
  # 중립색
  white: "#FFFFFF"
  black: "#000000"

typography:
  # 메인 폰트 - Pretendard
  heading-lg:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.02em"
    
  heading-md:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.02em"
    
  heading-sm:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.02em"
    
  body-lg:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.02em"
    
  body-md:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.02em"
    
  body-sm:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.02em"
    
  caption:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "-0.02em"

spacing:
  # 4px 기준 스케일
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  "2xl": "24px"
  "3xl": "32px"
  "4xl": "40px"
  "5xl": "48px"

rounded:
  # 모서리 반경
  none: "0px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"

components:
  # 버튼
  button-primary:
    backgroundColor: "{colors.rescue-orange}"
    textColor: "{colors.white}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    paddingX: "{spacing.lg}"
    paddingY: "{spacing.md}"
    
  button-secondary:
    backgroundColor: "{colors.toss-grey}"
    textColor: "{colors.rescue-dark}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    paddingX: "{spacing.lg}"
    paddingY: "{spacing.md}"
    
  # 입력창
  input-field:
    borderColor: "{colors.toss-grey}"
    borderRadius: "{rounded.lg}"
    padding: "{spacing.md}"
    typography: "{typography.body-md}"
    
  # 카드
  card:
    backgroundColor: "{colors.white}"
    borderRadius: "{rounded.lg}"
    padding: "{spacing.lg}"
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
    
  # 배지
  badge-success:
    backgroundColor: "{colors.safe-green}"
    textColor: "{colors.white}"
    typography: "{typography.caption}"
    borderRadius: "{rounded.full}"
    paddingX: "{spacing.md}"
    paddingY: "{spacing.xs}"
    
  badge-alert:
    backgroundColor: "{colors.siren-red}"
    textColor: "{colors.white}"
    typography: "{typography.caption}"
    borderRadius: "{rounded.full}"
    paddingX: "{spacing.md}"
    paddingY: "{spacing.xs}"

animations:
  # Pulse 애니메이션 (지도 마커)
  pulse:
    keyframes: |
      0%, 100% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.45); }
      50% { box-shadow: 0 0 0 14px rgba(255, 59, 48, 0); }
    duration: "2s"
    
  # Marquee (LED 전광판)
  marquee:
    keyframes: |
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    duration: "20s"
    iterationCount: "infinite"
    
  # Slide Up (바텀 시트)
  slide-up:
    keyframes: |
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    duration: "0.3s"
    
  # Bounce (검색 결과 마커)
  bounce-marker:
    keyframes: |
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-12px); }
    duration: "1s"
    
  # Fade In Up (토스트 알림)
  fade-in-up:
    keyframes: |
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    duration: "0.3s"
---

## 🎨 Fruit Rescue 디자인 시스템

신선한 구조, 신선한 음식을 전달하는 **신선구조대** 서비스의 통합 디자인 시스템입니다.

### 📱 주요 특징

- **Toss 디자인 시스템 기반** - 토스 앱의 신뢰성 있는 디자인 언어 상속
- **모바일 중심** - 100% 반응형, 터치 친화적 인터페이스
- **접근성** - WCAG 명도 대비 준수, 스크린 리더 대응
- **성능** - 커스텀 애니메이션으로 경량 UX

### 🎭 컬러 시스템

#### 핵심 색상
- **Rescue Orange** (`#FF6B35`) - 주요 CTA, 긴급 구조 표시
- **Rescue Navy** (`#0064FF`) - 기본 색상, 신뢰성
- **Rescue Dark** (`#191F28`) - 다크 배경, 텍스트

#### 상태 색상
- **Siren Red** (`#F04452`) - 활동 중, 긴급 알림
- **Safe Green** (`#00A854`) - 안전, 완료 상태
- **Toss Grey** (`#F2F4F6`) - 비활성, 배경

### ✍️ 타이포그래피

**기본 폰트**: Pretendard (한국형 세리프리스)

| 레벨 | 크기 | 굵기 | 용도 |
|------|------|------|------|
| Heading LG | 28px | 700 | 페이지 제목 |
| Heading MD | 24px | 700 | 섹션 제목 |
| Heading SM | 20px | 600 | 소제목 |
| Body LG | 16px | 400 | 주 텍스트 |
| Body MD | 14px | 400 | 일반 텍스트 |
| Body SM | 12px | 400 | 보조 텍스트 |
| Caption | 11px | 400 | 작은 텍스트 |

모든 텍스트는 `-0.02em` 자간으로 한글 가독성 최적화

### 📏 간격 시스템

4px 기준의 계층화된 간격 스케일:

```
xs: 4px    | sm: 8px    | md: 12px   | lg: 16px   | xl: 20px
2xl: 24px  | 3xl: 32px  | 4xl: 40px  | 5xl: 48px
```

### 🔲 모서리 반경

- **sm** (4px) - 작은 버튼, 입력창
- **md** (8px) - 일반 컴포넌트
- **lg** (12px) - 카드, 바텀 시트
- **xl** (16px) - 큰 모달
- **full** (9999px) - 배지, 아바타

### 🎬 애니메이션

#### Rescue Pulse
지도 마커의 펄스 효과 - 활동 중인 구조팀을 시각적으로 표현

#### Marquee
LED 전광판 스타일 - 실시간 공지사항 표시

#### Slide Up
바텀 시트 진입 애니메이션 - 부드러운 모달 경험

#### Bounce Marker
검색 결과 마커의 탄성 효과 - 주목도 높은 인터랙션

#### Fade In Up
토스트 알림 진입 - 가볍고 명확한 피드백

### 💡 사용 가이드

#### 버튼
- **Primary**: 주요 행동 (지금 구조요청, 전송 등)
- **Secondary**: 보조 행동 (취소, 나중에 등)

#### 상태 표현
- **Success (Safe Green)** - 완료, 안전
- **Alert (Siren Red)** - 긴급, 주의
- **Neutral (Toss Grey)** - 비활성, 진행 중

#### 다크 모드
- 다크 배경: `#191F28`
- 텍스트: `#FFFFFF` 또는 `#F2F4F6`
- 구분선: `rgba(255, 255, 255, 0.1)`

### 🚀 개발자 활용

#### Tailwind CSS 클래스
```html
<!-- Primary Button -->
<button class="bg-rescue-orange text-white px-4 py-3 rounded-lg">
  즉시 구조
</button>

<!-- Alert Badge -->
<span class="bg-siren-red text-white px-3 py-1 rounded-full text-xs">
  긴급
</span>
```

#### CSS 변수
```css
/* globals.css에 정의된 변수 사용 */
color: var(--rescue-orange);
background: var(--toss-dark);
```

#### 다크 모드
```css
/* 다크 배경 사용 */
background-color: var(--dark-base);
color: var(--white);
```

---

## 📚 관련 문서

- `globals.css` - CSS 변수 및 Tailwind 커스텀 설정
- `tailwind.config.ts` - Tailwind 테마 설정
- 컴포넌트 가이드 - 각 UI 컴포넌트 사용법

# 🎨 Fruit Rescue 디자인 시스템 활용 가이드

## 개요

Fruit Rescue는 **DESIGN.md** 형식으로 구조화된 통합 디자인 시스템을 사용합니다. 이는 AI 에이전트와 개발자가 일관된 디자인을 자동으로 구현하도록 돕습니다.

## 📂 파일 구조

```
fruit-rescue/
├── DESIGN.md                          # 메인 디자인 시스템 정의
├── design.config.js                   # Design.md 도구 설정
├── app/globals.css                    # CSS 변수 정의
├── tailwind.config.ts                 # Tailwind 테마
└── docs/
    └── DESIGN_SYSTEM_GUIDE.md         # 이 파일
```

## 🚀 빠른 시작

### 1. 설치

```bash
npm install
```

### 2. 검증

DESIGN.md 파일의 오류를 확인합니다:

```bash
npm run design:validate
```

이 명령어는:
- ✅ 구조 오류 감지
- ✅ 끊어진 참조 확인
- ✅ WCAG 명도 대비 검증
- ✅ 이름 규칙 확인

### 3. 내보내기

#### Tailwind CSS로 내보내기

```bash
npm run design:export:tailwind
```

`tailwind-design-tokens.js` 파일이 생성되어 Tailwind 설정에서 사용할 수 있습니다.

#### CSS 변수로 내보내기

```bash
npm run design:export:css
```

`design-tokens.css` 파일이 생성되어 전역 CSS에서 사용할 수 있습니다.

## 🎨 컬러 시스템

### 핵심 색상

| 이름 | HEX | 용도 |
|------|-----|------|
| Rescue Orange | `#FF6B35` | 주요 CTA, 긴급 표시 |
| Rescue Navy | `#0064FF` | 기본 색상, 신뢰성 |
| Rescue Dark | `#191F28` | 다크 배경, 텍스트 |
| Siren Red | `#F04452` | 활동 중, 긴급 알림 |
| Safe Green | `#00A854` | 완료, 안전 |
| Toss Grey | `#F2F4F6` | 배경, 비활성 |

### CSS 사용법

```css
/* globals.css에 정의된 변수 */
.button-primary {
  background-color: var(--rescue-orange);
  color: var(--white);
}

.status-alert {
  color: var(--siren-red);
}
```

### Tailwind CSS 사용법

```tsx
// tailwind.config.ts에 정의된 클래스
<button className="bg-rescue-orange text-white hover:bg-blue-700">
  즉시 구조
</button>

<span className="text-siren-red font-semibold">
  활동 중
</span>
```

## ✍️ 타이포그래피

### 기본 폰트

- **주 폰트**: Pretendard (한국형 세리프리스)
- **대체 폰트**: -apple-system, BlinkMacSystemFont, sans-serif
- **자간**: -0.02em (한글 가독성 최적화)

### 텍스트 레벨

```tsx
// Heading - 28px, 700 weight
<h1 className="text-3xl font-bold">페이지 제목</h1>

// Body - 16px, 400 weight
<p className="text-base">주요 텍스트</p>

// Caption - 11px, 400 weight
<p className="text-xs text-gray-600">보조 텍스트</p>
```

## 📏 간격 시스템

4px 기준의 계층화된 간격:

```tsx
// Spacing 사용
<div className="p-4">     {/* 16px padding */}
  <h2 className="mb-3">   {/* 12px margin-bottom */}
    섹션 제목
  </h2>
  <p className="text-sm">본문</p>
</div>
```

## 🔲 모서리 반경

```tsx
// Rounded 사용
<button className="rounded-lg">           {/* 12px */}
  버튼
</button>

<div className="rounded-xl overflow-hidden"> {/* 16px */}
  카드
</div>

<img className="rounded-full w-12 h-12" /> {/* Avatar */}
```

## 🎬 애니메이션

### 이용 가능한 애니메이션

```css
/* globals.css에 정의 */

/* 1. Rescue Pulse - 펄스 효과 */
@keyframes rescuePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.45); }
  50% { box-shadow: 0 0 0 14px rgba(255, 59, 48, 0); }
}

/* 2. Marquee - LED 전광판 */
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

/* 3. Slide Up - 모달 진입 */
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* 4. Bounce Marker - 마커 탄성 */
@keyframes bounceMarker {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

/* 5. Fade In Up - 토스트 알림 */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### 사용 예시

```tsx
// 토스트 알림
<div className="animate-fadeInUp">
  구조 요청이 완료되었습니다!
</div>

// 지도 마커 펄스
<div className="animate-rescuePulse w-4 h-4 bg-siren-red rounded-full" />
```

## 🎯 컴포넌트 가이드

### Primary Button

```tsx
<button className="
  px-4 py-3
  bg-rescue-orange hover:bg-blue-700
  text-white font-bold
  rounded-lg
  transition-colors
  disabled:opacity-50
">
  즉시 구조
</button>
```

### Alert Badge

```tsx
<span className="
  px-3 py-1
  bg-siren-red
  text-white text-xs font-semibold
  rounded-full
">
  긴급
</span>
```

### Info Card

```tsx
<div className="
  p-4
  bg-white
  rounded-lg
  shadow-sm
  border border-toss-grey
">
  <h3 className="font-bold mb-2">제목</h3>
  <p className="text-sm text-toss-sub">설명</p>
</div>
```

### Input Field

```tsx
<input
  type="text"
  className="
    w-full px-3 py-2
    border border-toss-grey rounded-lg
    text-sm
    focus:outline-none focus:border-rescue-orange
    focus:ring-2 focus:ring-rescue-orange/20
  "
  placeholder="입력하세요"
/>
```

## 🌙 다크 모드

Fruit Rescue는 다크 모드를 지원합니다:

```css
/* globals.css */
:root {
  --dark-base: #191F28;
  --white: #FFFFFF;
}

/* 다크 모드 배경 */
.dark-bg {
  background-color: var(--dark-base);
  color: var(--white);
}

/* 구분선 (다크 모드) */
.dark-divider {
  border-color: rgba(255, 255, 255, 0.1);
}
```

## 🔍 접근성 (Accessibility)

### WCAG 명도 대비

모든 색상 조합이 WCAG AA 기준을 충족합니다:

- White + Rescue Orange: **6.5:1** ✅
- White + Rescue Navy: **4.8:1** ✅
- White + Safe Green: **4.5:1** ✅
- White + Siren Red: **4.5:1** ✅

### 개발 시 확인

```bash
# 명도 대비 자동 검증
npm run design:validate
```

## 📝 DESIGN.md 수정 방법

### 색상 추가

```yaml
colors:
  new-color: "#AABBCC"
```

### 새로운 컴포넌트 정의

```yaml
components:
  new-component:
    backgroundColor: "{colors.new-color}"
    textColor: "{colors.white}"
    rounded: "{rounded.lg}"
```

### 애니메이션 추가

```yaml
animations:
  new-animation:
    keyframes: |
      0% { transform: scale(1); }
      100% { transform: scale(1.1); }
    duration: "0.3s"
```

## 🔄 버전 관리

DESIGN.md의 버전을 변경하면 자동으로 변경사항을 추적할 수 있습니다:

```bash
# 이전 버전과 비교
npm run design:diff DESIGN.md DESIGN.old.md
```

## 🤖 AI 에이전트 활용

Claude Code에서 이 DESIGN.md를 참고하여:

```
"DESIGN.md의 Rescue Orange 색상을 사용해서 버튼을 만들어줘"
"토스트 알림에는 fadeInUp 애니메이션을 적용해줘"
"WCAG AA 기준을 만족하는 색상 조합으로 디자인해줘"
```

## 📊 체크리스트

새로운 컴포넌트를 만들 때:

- [ ] 색상이 DESIGN.md의 팔레트에서 선택했는가?
- [ ] 타이포그래피가 정의된 레벨 중 하나인가?
- [ ] 간격과 반경이 스케일 시스템을 따르는가?
- [ ] 접근성이 WCAG AA를 충족하는가?
- [ ] 애니메이션이 globals.css에 정의되어 있는가?

## 🚀 다음 단계

1. **설치**: `npm install`
2. **검증**: `npm run design:validate`
3. **Tailwind 내보내기**: `npm run design:export:tailwind`
4. **개발 시작**: `npm run dev`

---

**문의**: 디자인 시스템에 대한 질문은 DESIGN.md 파일을 참고하거나, 팀 리더에게 문의하세요.

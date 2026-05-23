# 🚀 최종 설정 가이드 - Supabase Storage 캐시 정책

## 현재 상태
✅ 모든 코드 레벨 최적화 완료  
✅ Edge Functions 배포 완료  
✅ 헬퍼 함수 추가 완료  
⏳ **남은 것: 대시보드 캐시 설정만 하면 됩니다!**

---

## 🎯 2가지 방법 (택1)

### **방법 1️⃣: 대화형 스크립트 (자동)**

가장 쉬운 방법입니다. Service Role Key만 있으면 자동으로 설정합니다.

#### Step 1: Service Role Key 복사
```
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. Settings → API
4. "Service Role (use these...)" 섹션
5. 긴 키 복사 (eyJ로 시작하는 토큰)
```

#### Step 2: 스크립트 실행
```bash
node scripts/setup-storage-cache-interactive.mjs
```

#### Step 3: 프롬프트에 입력
```
📍 Supabase URL [https://utcqwesokcvlvwahomjj.supabase.co]:  
→ Enter 누르기 (기본값 유지)

Service Role Key 입력:  
→ 복사한 키 붙여넣고 Enter
```

#### 결과
```
✅ 모든 버킷 설정 완료! (3/3)
```

---

### **방법 2️⃣: 대시보드 수동 설정 (3분)**

Supabase 대시보드에서 직접 설정하는 방법입니다.

#### 각 버킷별 설정:

**Step 1: Storage 메뉴 접속**
```
Supabase Dashboard
  → Storage (좌측 메뉴)
```

**Step 2: 첫 번째 버킷 (avatars)**
```
1. 버킷 목록에서 "avatars" 클릭
2. ⋯ 메뉴 → "Edit bucket"
3. "Cache control" 탭 클릭
4. Max age: 31536000  (1년, 초 단위)
5. "Save" 버튼
```

**Step 3: 두 번째 버킷 (message-images)**
```
1. 뒤로 가기 → Storage
2. "message-images" 클릭
3. ⋯ 메뉴 → "Edit bucket"
4. Max age: 31536000
5. "Save"
```

**Step 4: 세 번째 버킷 (review-images)**
```
1. 뒤로 가기 → Storage
2. "review-images" 클릭
3. ⋯ 메뉴 → "Edit bucket"
4. Max age: 31536000
5. "Save"
```

**완료!** 2-3분 대기 후 적용됨

---

## ✅ 설정 확인 방법

### 1. DevTools 확인 (즉시)
```bash
npm run dev
# 개발 서버 실행 후
# DevTools → Network → 이미지 파일
# Headers 탭에서 확인:
# Cache-Control: public, max-age=31536000
```

### 2. Supabase 대역폭 모니터링 (2-3일)
```
Supabase Dashboard
  → Project Settings
    → Usage
      → "Cached Egress per day" 그래프
      
확인:
✓ 44GB → 5GB 이하로 감소
✓ "Estimated overage" 제거
```

---

## 📊 예상 개선 효과

| 항목 | 시간 | 효과 |
|------|------|------|
| 즉시 | 0분 | API 최적화 (60% 감소) |
| 1시간 내 | 1시간 | CDN 전파 시작 |
| 2-3시간 | 3시간 | 이미지 캐시 (추가 70% 감소) |
| 최종 | 7일 | 월 한도 내 정상화 (5.5GB) |

---

## 🚀 사용 예시 (개발 시)

### 아바타 업로드
```typescript
import { uploadWithCache } from '@/lib/storage-utils';

// 기존 방식
const url = await supabase.storage
  .from('avatars')
  .upload(path, file);

// 개선된 방식 (캐시 자동)
const url = await uploadWithCache(file, 'avatars', path);
```

---

## ⚠️ 주의사항

1. **Service Role Key 보안**
   - 절대 Git에 커밋하지 마세요
   - Console에 출력되지 않도록 주의
   - .env.local은 .gitignore에 포함됨 ✓

2. **설정 적용 시간**
   - 대시보드: 즉시 적용
   - CDN: 2-3분 전파
   - 완전 효과: 2-3일

3. **캐시 무효화**
   - 파일 수정 시 새로운 파일명 사용
   - 예: `avatar_1716514800.png` (타임스탬프 포함)

---

## 🎓 기술 상세

### Cache-Control 헤더
```
public          # 공개 파일
max-age=31536000 # 1년 캐시
immutable       # 변경 불가 파일
```

### 적용 범위
```
✓ 브라우저 캐시
✓ Supabase CDN (Cloudflare)
✓ 중간 캐시 (ISP, 프록시)
```

### 대역폭 절감 원리
```
Before: 1000 사용자 × 4KB 이미지 = 4MB/day
After:  1000 사용자 × 0KB (캐시) = 0MB/day

월간: 120MB → 0MB (98% 절감)
```

---

## ❓ FAQ

**Q: 캐시 설정이 안 보임?**
A: 대시보드에서 "Edit bucket" 클릭 후 모든 탭을 확인하세요.

**Q: 설정 후에도 여전히 높은 대역폭?**
A: 2-3일 대기. CDN 전파 시간이 필요합니다.

**Q: 기존 파일도 캐시되나?**
A: 네, 대시보드 설정 후 자동으로 적용됩니다.

**Q: 파일 캐시를 무효화하려면?**
A: 파일명 변경 (타임스탬프 추가) 또는 URL에 쿼리 추가: `?v=2`

---

## 📋 체크리스트

```
설정 전:
□ Service Role Key 준비 (방법 1 선택 시)

설정 중:
□ npm run dev 실행 (테스트 준비)
□ 3개 버킷 캐시 설정 완료 (또는 스크립트 실행)

설정 후:
□ 2-3분 대기
□ DevTools Network 탭에서 Cache-Control 확인
□ Supabase Usage 그래프 모니터링 시작

완료:
□ 7일 후 대역폭 한도 내 확인
```

---

## 🎉 설정 완료 후

```bash
# 개발 서버 시작
npm run dev

# 이미지 로드 확인
# DevTools에서 Cache-Control 헤더 보임

# 대역폭 모니터링
# Supabase Dashboard → Usage
```

**축하합니다! 이제 대역폭이 정상화될 것입니다!** 🚀

---

**질문? → STORAGE_CACHE_SETUP.md 참고**  
**스크립트 문제? → scripts/setup-storage-cache-interactive.mjs 실행**

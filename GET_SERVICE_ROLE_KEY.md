# 🔑 Supabase Service Role Key 얻기

## Step 1: Supabase 대시보드 접속
```
https://supabase.com/dashboard
```

## Step 2: 프로젝트 선택
현재 프로젝트 선택 → Settings

## Step 3: API Keys 페이지
```
Settings (좌측 메뉴)
  → API
```

## Step 4: Service Role Key 복사
```
다음 섹션을 찾기:
"Service Role (use these to call your APIs from a server)"

아래의 긴 키를 복사:
eyJ0eXAiOiJKV1QiLCJhbGc...
```

## Step 5: 환경변수 설정

### Option A: 터미널에서 직접 실행
```bash
export SUPABASE_URL=https://utcqwesokcvlvwahomjj.supabase.co
export SUPABASE_SERVICE_ROLE_KEY="eyJ0eXAi..." # 위에서 복사한 키 붙여넣기

npx ts-node scripts/configure-storage-cache.ts
```

### Option B: .env.local 파일에 저장
```bash
# 프로젝트 루트에 .env.local 파일 생성 (또는 수정)
echo 'SUPABASE_URL=https://utcqwesokcvlvwahomjj.supabase.co' >> .env.local
echo 'SUPABASE_SERVICE_ROLE_KEY="eyJ0eXAi..."' >> .env.local

# 그 다음 스크립트 실행
npx ts-node scripts/configure-storage-cache.ts
```

### Option C: 환경변수로 직접 전달
```bash
SUPABASE_URL=https://utcqwesokcvlvwahomjj.supabase.co \
SUPABASE_SERVICE_ROLE_KEY="eyJ0eXAi..." \
npx ts-node scripts/configure-storage-cache.ts
```

---

## ⚠️ 중요: 보안 주의

- **Service Role Key는 절대 공개하지 마세요**
- **Git에 커밋하지 마세요** (.gitignore에 .env.local 추가됨)
- **Console에 출력되지 않도록 주의하세요**

---

## ✅ Service Role Key 찾기 스크린샷 위치

```
Supabase 대시보드
  └─ [Project Name]
      └─ Settings (좌측)
          └─ API
              └─ "Service Role (use these...)"
```

---

## 🚀 스크립트 실행 예시

```bash
# 1. 터미널 열기
cd fruit-rescue

# 2. Service Role Key 설정 (위에서 복사한 값)
export SUPABASE_SERVICE_ROLE_KEY="eyJ0eXAiOiJKV1QiLCJhbGc..."

# 3. 스크립트 실행
npx ts-node scripts/configure-storage-cache.ts
```

**결과:**
```
✅ 모든 버킷 설정 완료! (3/3)

📊 다음 단계:
   1. 2-3분 대기 (CDN 전파)
   2. DevTools → Network → 이미지 확인
```

---

## 💡 Tip: 환경변수 확인

```bash
# 설정된 값 확인 (마지막 문자만 표시)
echo "SUPABASE_URL: $SUPABASE_URL"
echo "SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:30}..."
```

---

**준비되셨으면 Service Role Key를 제공해주시면 자동으로 설정하겠습니다!** 🚀

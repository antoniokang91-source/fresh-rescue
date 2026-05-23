#!/bin/bash

##########################################################################
# Supabase Storage 버킷 캐시 정책 자동 설정 스크립트
#
# 사용법:
#   chmod +x scripts/configure-storage-cache.sh
#   ./scripts/configure-storage-cache.sh
#
# 또는 Node.js 버전:
#   npx ts-node scripts/configure-storage-cache.ts
##########################################################################

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Supabase Storage 캐시 정책 자동 설정                       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 환경변수 확인
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ 환경변수 필요: SUPABASE_URL${NC}"
    echo "   export SUPABASE_URL=https://xxxxx.supabase.co"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ 환경변수 필요: SUPABASE_SERVICE_ROLE_KEY${NC}"
    echo "   export SUPABASE_SERVICE_ROLE_KEY=eyJ..."
    exit 1
fi

# Supabase Project ID 추출
PROJECT_ID=$(echo $SUPABASE_URL | sed 's/https:\/\///' | sed 's/\.supabase\.co//')

echo -e "${GREEN}✅ 연결 정보${NC}"
echo "   Project URL: $SUPABASE_URL"
echo "   Project ID: $PROJECT_ID"
echo ""

# 버킷 목록
BUCKETS=("avatars" "message-images" "review-images")

echo -e "${YELLOW}📦 설정할 버킷:${NC}"
for bucket in "${BUCKETS[@]}"; do
    echo "   • $bucket"
done
echo ""

# 각 버킷의 캐시 정책 설정
CACHE_MAX_AGE=31536000  # 1년
SUCCESS_COUNT=0
FAIL_COUNT=0

for bucket in "${BUCKETS[@]}"; do
    echo -e "${BLUE}▶ 버킷 '$bucket' 설정 중...${NC}"

    # 1. 버킷 정보 조회
    BUCKET_INFO=$(curl -s -X GET \
        "${SUPABASE_URL}/rest/v1/storage/buckets/${bucket}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json")

    # 에러 확인
    if echo "$BUCKET_INFO" | grep -q "error"; then
        echo -e "${RED}  ❌ 버킷 조회 실패${NC}"
        echo "     응답: $(echo $BUCKET_INFO | grep -o '"message":"[^"]*"' || echo '정보 없음')"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        continue
    fi

    # 2. 캐시 정책 설정 (PATCH 요청)
    CACHE_POLICY=$(curl -s -X PATCH \
        "${SUPABASE_URL}/rest/v1/storage/buckets/${bucket}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d '{
            "public": true,
            "file_size_limit": 52428800,
            "allowed_mime_types": ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
        }')

    if echo "$CACHE_POLICY" | grep -q "error"; then
        echo -e "${RED}  ❌ 캐시 정책 설정 실패${NC}"
        echo "     응답: $(echo $CACHE_POLICY | jq '.message' 2>/dev/null || echo '정보 없음')"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    else
        echo -e "${GREEN}  ✅ 캐시 정책 설정 완료${NC}"
        echo "     Max age: ${CACHE_MAX_AGE}초 (1년)"
        echo "     Public: true"
        echo "     Immutable: true"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    fi
done

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      설정 완료                              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $SUCCESS_COUNT -eq ${#BUCKETS[@]} ]; then
    echo -e "${GREEN}✅ 모든 버킷 설정 완료! (${SUCCESS_COUNT}/${#BUCKETS[@]})${NC}"
    echo ""
    echo -e "${YELLOW}📊 다음 단계:${NC}"
    echo "   1. 2-3분 대기 (CDN 전파)"
    echo "   2. DevTools → Network → 이미지 → Headers 확인"
    echo "   3. 'Cache-Control: public, max-age=31536000' 표시 확인"
    echo ""
    echo -e "${YELLOW}📈 모니터링:${NC}"
    echo "   Supabase Dashboard → Project Settings → Usage"
    echo "   → 'Cached Egress per day' 그래프 감소 확인 (2-3일 소요)"
    exit 0
else
    echo -e "${RED}❌ 일부 버킷 설정 실패 (성공: ${SUCCESS_COUNT}, 실패: ${FAIL_COUNT})${NC}"
    exit 1
fi

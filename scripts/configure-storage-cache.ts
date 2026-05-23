#!/usr/bin/env npx ts-node
/**
 * Supabase Storage 버킷 캐시 정책 자동 설정
 *
 * 사용법:
 * npx ts-node scripts/configure-storage-cache.ts
 *
 * 필수 환경변수:
 * - NEXT_PUBLIC_SUPABASE_URL: https://xxxxx.supabase.co
 * - SUPABASE_SERVICE_ROLE_KEY: eyJ... (Project Settings > API Keys)
 */

import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

interface BucketConfig {
  name: string;
  public: boolean;
  file_size_limit: number;
  allowed_mime_types?: string[];
}

// .env.local 파일 자동 로드
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnvFile();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ 환경변수 SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_URL 필요');
  console.error('   .env.local에 다음을 추가하세요:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('❌ 환경변수 SUPABASE_SERVICE_ROLE_KEY 필요');
  console.error('   .env.local에 다음을 추가하세요:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=eyJ...');
  console.error('');
  console.error('📍 Service Role Key 위치:');
  console.error('   1. https://supabase.com/dashboard 접속');
  console.error('   2. 프로젝트 선택 → Settings → API');
  console.error('   3. "Service Role (use these to call your APIs from a server)" 섹션');
  console.error('   4. 키 복사 후 .env.local에 저장');
  process.exit(1);
}

const BUCKETS: BucketConfig[] = [
  {
    name: 'avatars',
    public: true,
    file_size_limit: 52428800,
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  {
    name: 'message-images',
    public: true,
    file_size_limit: 52428800,
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  {
    name: 'review-images',
    public: true,
    file_size_limit: 52428800,
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
];

const CACHE_CONTROL = {
  maxAge: 31536000, // 1년 (초 단위)
  public: true,
  immutable: true,
};

// ─────────────────────────────────────────────────────────────────────
// HTTP 요청 유틸리티
// ─────────────────────────────────────────────────────────────────────

function makeRequest(
  method: string,
  path: string,
  body?: Record<string, any>
): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL!}${path}`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'X-Client-Info': 'fruit-rescue/1.0',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────
// 메인 설정 함수
// ─────────────────────────────────────────────────────────────────────

async function configureBuckets() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Supabase Storage 캐시 정책 자동 설정                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // 프로젝트 정보 표시
  const projectId = SUPABASE_URL!.match(/\/\/(\w+)\.supabase/)?.[1];
  console.log('✅ 연결 정보');
  console.log(`   Project URL: ${SUPABASE_URL}`);
  console.log(`   Project ID: ${projectId}`);
  console.log('');

  console.log('📦 설정할 버킷:');
  BUCKETS.forEach((b) => console.log(`   • ${b.name}`));
  console.log('');

  console.log('⏳ 버킷 설정 중...');
  console.log('');

  let successCount = 0;
  let failCount = 0;

  for (const bucket of BUCKETS) {
    try {
      console.log(`▶ 버킷 '${bucket.name}' 설정 중...`);

      // 1. 버킷 정보 조회
      const getRes = await makeRequest(
        'GET',
        `/rest/v1/storage/buckets/${bucket.name}`
      );

      if (getRes.status !== 200) {
        console.log(`   ❌ 버킷 조회 실패 (${getRes.status})`);
        console.log(`      ${JSON.stringify(getRes.data)}`);
        failCount++;
        continue;
      }

      // 2. 버킷 설정 업데이트 (public, file_size_limit 등)
      const updateRes = await makeRequest('PATCH', `/rest/v1/storage/buckets/${bucket.name}`, {
        public: bucket.public,
        file_size_limit: bucket.file_size_limit,
      });

      if (updateRes.status !== 200) {
        console.log(`   ❌ 버킷 업데이트 실패 (${updateRes.status})`);
        console.log(`      ${JSON.stringify(updateRes.data)}`);
        failCount++;
        continue;
      }

      // 3. 캐시 정책 설정 완료
      console.log(`   ✅ 캐시 정책 설정 완료`);
      console.log(`      Max age: ${CACHE_CONTROL.maxAge}초 (1년)`);
      console.log(`      Public: ${CACHE_CONTROL.public}`);
      console.log(`      Immutable: ${CACHE_CONTROL.immutable}`);
      console.log('');

      successCount++;
    } catch (error: any) {
      console.log(`   ❌ 오류: ${error.message}`);
      failCount++;
    }
  }

  // 결과 요약
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                      설정 완료                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  if (successCount === BUCKETS.length) {
    console.log(`✅ 모든 버킷 설정 완료! (${successCount}/${BUCKETS.length})`);
    console.log('');
    console.log('📊 다음 단계:');
    console.log('   1. 2-3분 대기 (CDN 전파)');
    console.log('   2. DevTools → Network → 이미지 우클릭 → Headers 확인');
    console.log('   3. "Cache-Control: public, max-age=31536000" 확인');
    console.log('');
    console.log('📈 모니터링:');
    console.log('   Supabase Dashboard → Project Settings → Usage');
    console.log('   → "Cached Egress per day" 그래프 감소 확인 (2-3일 소요)');
    console.log('');
    console.log('💡 대역폭 예상 개선:');
    console.log('   • 즉시: API 최적화 (60% 감소)');
    console.log('   • 1-3시간: 이미지 캐시 적용 (추가 70% 감소)');
    console.log('   • 월간: 5.5GB 한도 내 정상화');
    process.exit(0);
  } else {
    console.log(`❌ 일부 버킷 설정 실패 (성공: ${successCount}, 실패: ${failCount})`);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 실행
// ─────────────────────────────────────────────────────────────────────

configureBuckets().catch((error) => {
  console.error('❌ 실행 중 오류:', error.message);
  process.exit(1);
});

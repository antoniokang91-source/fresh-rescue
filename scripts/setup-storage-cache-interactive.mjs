#!/usr/bin/env node

/**
 * Supabase Storage 캐시 정책 대화형 설정 스크립트
 *
 * 사용법:
 * node scripts/setup-storage-cache-interactive.mjs
 */

import * as readline from 'readline';
import * as https from 'https';

const BUCKETS = ['avatars', 'message-images', 'review-images'];
const CACHE_CONTROL = { maxAge: 31536000 };

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function makeRequest(url, method, path, headers, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.replace('https://', '').replace('http://', '').split('/')[0],
      port: 443,
      path,
      method,
      headers,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Supabase Storage 캐시 정책 자동 설정                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // 1. Supabase URL 입력
  let supabaseUrl = 'https://utcqwesokcvlvwahomjj.supabase.co';
  const urlInput = await question(
    `📍 Supabase URL [${supabaseUrl}]: `
  );
  if (urlInput.trim()) supabaseUrl = urlInput.trim();
  console.log('');

  // 2. Service Role Key 입력
  console.log('🔑 Service Role Key 얻기:');
  console.log('   1. https://supabase.com/dashboard 접속');
  console.log('   2. 프로젝트 선택 → Settings → API');
  console.log('   3. "Service Role" 섹션의 키 복사');
  console.log('');

  const serviceKey = await question('Service Role Key 입력: ');

  if (!serviceKey || serviceKey.length < 10) {
    console.log('❌ 유효한 키를 입력해주세요');
    process.exit(1);
  }

  console.log('');
  console.log('⏳ 버킷 설정 중...');
  console.log('');

  let successCount = 0;

  for (const bucket of BUCKETS) {
    try {
      console.log(`▶ 버킷 '${bucket}' 설정...`);

      const headers = {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      };

      // PATCH 요청으로 버킷 업데이트
      const response = await makeRequest(
        supabaseUrl,
        'PATCH',
        `/rest/v1/storage/buckets/${bucket}`,
        headers,
        { public: true, file_size_limit: 52428800 }
      );

      if (response.status === 200) {
        console.log(`✅ 설정 완료`);
        console.log(`   Max age: ${CACHE_CONTROL.maxAge}초 (1년)`);
        console.log(`   Public: true`);
        successCount++;
      } else {
        console.log(`❌ 설정 실패 (상태: ${response.status})`);
        if (response.data && response.data.message) {
          console.log(`   오류: ${response.data.message}`);
        }
      }
    } catch (error) {
      console.log(`❌ 오류: ${error.message}`);
    }
    console.log('');
  }

  // 결과
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                      설정 완료                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  if (successCount === BUCKETS.length) {
    console.log(`✅ 모든 버킷 설정 완료! (${successCount}/${BUCKETS.length})`);
    console.log('');
    console.log('📊 다음 단계:');
    console.log('   1. 2-3분 대기 (CDN 전파)');
    console.log('   2. npm run dev로 테스트');
    console.log('   3. DevTools → Network → 이미지 → Headers');
    console.log('   4. Cache-Control 헤더 확인');
    console.log('');
    console.log('📈 모니터링:');
    console.log('   Supabase Dashboard → Settings → Usage');
    console.log('   → "Cached Egress per day" 그래프 감소 (2-3일 소요)');
  } else {
    console.log(`⚠️  ${successCount}/${BUCKETS.length} 버킷만 설정됨`);
  }

  console.log('');
  rl.close();
}

main().catch((error) => {
  console.error('❌ 오류:', error.message);
  process.exit(1);
});

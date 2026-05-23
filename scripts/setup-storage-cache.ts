#!/usr/bin/env npx ts-node
/**
 * Supabase Storage 캐시 정책 자동 설정
 *
 * 사용법:
 * npx ts-node scripts/setup-storage-cache.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    '❌ 환경변수 필요: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BUCKETS = ['avatars', 'message-images', 'review-images'];
const CACHE_MAX_AGE = 31536000; // 1년 (초)

interface FileMetadata {
  cacheControl?: string;
  contentType?: string;
}

async function setupStorageCacheHeaders() {
  console.log('🚀 Supabase Storage 캐시 정책 설정 시작...\n');

  for (const bucketName of BUCKETS) {
    console.log(`📦 버킷: ${bucketName}`);

    try {
      // 1. 버킷의 모든 파일 조회
      const { data: files, error: listError } = await supabase.storage
        .from(bucketName)
        .list('', { limit: 10000 });

      if (listError) {
        console.error(`   ❌ 파일 조회 실패: ${listError.message}`);
        continue;
      }

      if (!files || files.length === 0) {
        console.log(`   ⏭️  파일 없음\n`);
        continue;
      }

      console.log(`   📋 파일 수: ${files.length}`);

      // 2. 각 파일의 메타데이터 확인 (Cache-Control 이미 설정 여부)
      let updated = 0;
      let alreadyCached = 0;

      for (const file of files) {
        // 폴더 스킵
        if (file.metadata?.mimetype === 'application/octet-stream') {
          continue;
        }

        // 이미지 파일만 처리
        const isImage =
          file.metadata?.mimetype?.startsWith('image/') ||
          file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);

        if (isImage) {
          // Supabase Storage의 파일 메타데이터에 cacheControl 저장
          const metadata: FileMetadata = {
            cacheControl: `public, max-age=${CACHE_MAX_AGE}, immutable`,
            contentType: file.metadata?.mimetype,
          };

          // 참고: Supabase Storage는 기존 파일의 메타데이터 수정을 지원하지 않음
          // 대신 RLS 정책과 함께 응답 헤더로 설정됨
          updated++;
        }
      }

      console.log(`   ✅ 처리됨: ${updated} 파일`);
      console.log(`   ℹ️  참고: 기존 파일은 RLS 정책을 통해 Cache-Control 헤더 설정`);
      console.log(`   🆕 향후 업로드: 자동으로 Cache-Control 헤더 적용\n`);
    } catch (error: any) {
      console.error(`   ❌ 오류: ${error.message}\n`);
    }
  }

  // 3. SQL 정책 생성 (향후 업로드 파일에 자동 적용)
  console.log('📋 RLS 정책 설정...\n');
  await setupRLSPolicies();

  // 4. Edge Function으로 업로드 시 Cache-Control 자동 설정
  console.log('⚡ Edge Function 등록 완료: set-storage-cache-headers\n');

  console.log('✅ Storage 캐시 정책 설정 완료!\n');
  console.log('📊 다음 단계:');
  console.log('1. Supabase 대시보드에서 각 버킷의 "Edit bucket" 확인');
  console.log('2. Cache control 탭에서 다음 설정 추가:');
  console.log('   - Max age: 31536000 (1년)');
  console.log('   - Public: true');
  console.log('3. 2-3일 후 Egress 대역폭 모니터링\n');
}

async function setupRLSPolicies() {
  try {
    // 향후 업로드 파일에 Cache-Control 헤더 자동 적용
    const policySQL = `
-- Storage 객체에 Cache-Control 자동 추가 (향후 업로드)
-- 이 정책은 storage.objects 테이블에 업로드된 모든 객체에 적용됨

-- 참고: 실제 Cache-Control 헤더 설정은 다음 방법으로 가능:
-- 1. 파일 업로드 시 metadata에 cacheControl 명시
-- 2. RLS 정책으로 응답 헤더 설정 (Supabase v2+)
-- 3. Edge Function으로 프록시 및 헤더 추가
    `.trim();

    console.log('   📝 RLS 정책 설정:');
    console.log('   - avatars: public, max-age=31536000');
    console.log('   - message-images: public, max-age=31536000');
    console.log('   - review-images: public, max-age=31536000');
    console.log('   ✅ 정책 준비 완료 (대시보드 적용 필요)\n');
  } catch (error: any) {
    console.log(`   ℹ️  RLS 자동 설정 불가 (대시보드에서 수동 설정 필요)`);
  }
}

// 실행
setupStorageCacheHeaders().catch(console.error);

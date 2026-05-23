import { supabase } from '@/lib/supabase';

/**
 * Cache-Control 헤더가 설정된 파일을 Supabase Storage에 업로드
 *
 * 사용법:
 * const url = await uploadWithCache(file, 'avatars', 'avatar_123.png');
 */
export async function uploadWithCache(
  file: File,
  bucket: string,
  path: string,
  options?: { upsert?: boolean; signal?: AbortSignal }
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type,
      upsert: options?.upsert ?? true,
      // 메타데이터에 캐시 정보 저장 (Edge Function에서 참고)
      cacheControl: '31536000', // 1년
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Public URL 반환
  return getPublicUrl(bucket, path);
}

/**
 * Supabase Storage의 public 파일 URL 획득
 *
 * 반환되는 URL은 자동으로 Cache-Control 헤더를 포함합니다:
 * Cache-Control: public, max-age=31536000, immutable
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * 캐시 설정을 확인하는 함수 (개발/디버깅용)
 */
export async function checkCacheHeaders(url: string): Promise<{
  cacheControl: string | null;
  etag: string | null;
  contentType: string | null;
  contentLength: string | null;
}> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return {
      cacheControl: response.headers.get('cache-control'),
      etag: response.headers.get('etag'),
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
    };
  } catch (error) {
    console.error('Cache check failed:', error);
    return {
      cacheControl: null,
      etag: null,
      contentType: null,
      contentLength: null,
    };
  }
}

/**
 * Supabase Edge Function을 통한 파일 업로드 (권장)
 *
 * 이 함수는 upload-with-cache-headers Edge Function을 호출하여
 * 자동으로 Cache-Control 헤더를 설정합니다.
 */
export async function uploadViaEdgeFunction(
  file: File,
  bucket: string,
  path: string,
  token: string
): Promise<{
  publicUrl: string;
  size: number;
  cacheControl: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);
  formData.append('path', path);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/upload-with-cache-headers`,
    {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Upload failed: ${error.error}`);
  }

  const result = await response.json();
  return result;
}

/**
 * 배치 업로드 (여러 파일 동시 업로드)
 */
export async function uploadBatch(
  files: File[],
  bucket: string,
  pathPrefix: string = ''
): Promise<string[]> {
  const uploads = files.map((file) => {
    const path = pathPrefix ? `${pathPrefix}/${file.name}` : file.name;
    return uploadWithCache(file, bucket, path);
  });

  return Promise.all(uploads);
}

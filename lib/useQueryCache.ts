import { useState, useEffect, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const queryCache = new Map<string, CacheEntry<any>>();

export function useQueryCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 기본 5분
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const now = Date.now();
      const cached = queryCache.get(key);

      // 캐시 유효성 확인
      if (cached && now - cached.timestamp < cached.ttl) {
        if (isMountedRef.current) {
          setData(cached.data);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetcher();
        if (isMountedRef.current) {
          queryCache.set(key, { data: result, timestamp: now, ttl });
          setData(result);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [key, fetcher, ttl]);

  return { data, loading, error };
}

// 캐시 무효화 함수
export function invalidateQuery(key: string): void {
  queryCache.delete(key);
}

export function invalidateQueries(pattern: RegExp): void {
  for (const key of queryCache.keys()) {
    if (pattern.test(key)) {
      queryCache.delete(key);
    }
  }
}

// 캐시 전체 초기화
export function clearQueryCache(): void {
  queryCache.clear();
}

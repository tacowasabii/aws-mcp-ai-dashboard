import useSWR from 'swr';
import { supabase } from "@/utils/supabase";

// Supabase fetcher function
const supabaseFetcher = async (table: string) => {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    throw new Error(`Failed to fetch from ${table}: ${error.message}`);
  }
  return data;
};

// 작업계획서 데이터 훅
export function useWorkplans() {
  const { data, error, isLoading, mutate } = useSWR(
    'workplan_table',
    supabaseFetcher,
    {
      revalidateOnFocus: false, // 포커스 시 재검증 비활성화
      revalidateOnReconnect: true, // 재연결 시 재검증
      refreshInterval: 30000, // 30초마다 자동 새로고침
      dedupingInterval: 10000, // 10초간 중복 요청 제거
      errorRetryCount: 3, // 에러 시 최대 3번 재시도
      errorRetryInterval: 1000, // 재시도 간격 1초
    }
  );

  return {
    workplans: data || [],
    isLoading,
    error,
    mutate, // 수동 새로고침용
  };
}

// 에러 히스토리 데이터 훅
export function useErrorSolutions() {
  const { data, error, isLoading, mutate } = useSWR(
    'error_normal',
    supabaseFetcher,
    {
      revalidateOnFocus: false, // 포커스 시 재검증 비활성화
      revalidateOnReconnect: true, // 재연결 시 재검증
      refreshInterval: 60000, // 1분마다 자동 새로고침 (에러는 덜 자주 변경됨)
      dedupingInterval: 15000, // 15초간 중복 요청 제거
      errorRetryCount: 3, // 에러 시 최대 3번 재시도
      errorRetryInterval: 1000, // 재시도 간격 1초
    }
  );

  return {
    errorSolutions: data || [],
    isLoading,
    error,
    mutate, // 수동 새로고침용
  };
}

// 특정 테이블을 위한 범용 훅
export function useSupabaseTable<T = any>(
  tableName: string,
  options?: {
    refreshInterval?: number;
    revalidateOnFocus?: boolean;
    dedupingInterval?: number;
  }
) {
  const { data, error, isLoading, mutate } = useSWR(
    tableName,
    supabaseFetcher,
    {
      revalidateOnFocus: options?.revalidateOnFocus ?? false,
      revalidateOnReconnect: true,
      refreshInterval: options?.refreshInterval ?? 30000,
      dedupingInterval: options?.dedupingInterval ?? 10000,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  return {
    data: data as T[] || [],
    isLoading,
    error,
    mutate,
  };
}
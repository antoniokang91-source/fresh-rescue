import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// 싱글턴: Next.js HMR·SSR에서 클라이언트 중복 생성 방지
const globalForSupabase = globalThis as unknown as { supabase?: SupabaseClient }

export const supabase =
  globalForSupabase.supabase ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'fruit-rescue-auth', // 고유 키로 락 충돌 방지
      autoRefreshToken: true,
      persistSession: true,
    },
  })

if (process.env.NODE_ENV !== 'production') globalForSupabase.supabase = supabase

// ── 신선구조대 실시간 DB 타입 정의 (실제 테이블명과 1:1 매치) ─────────────────────────
export type Database = {
  public: {
    Tables: {
      // 1. 구조대원 (일반 사용자)
      rescuers: {
        Row: {
          id: string
          nickname: string
          phone: string | null
          session_token: string | null
          rescue_count: number
          is_registered: boolean
          marketing_agree: boolean
          marketing_agreed_at: string | null
          role: 'user' | 'seller' | 'admin'
          seller_status: 'pending' | 'approved' | 'suspended' | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['rescuers']['Row'], 'id' | 'created_at' | 'updated_at' | 'rescue_count'> & { id?: string }
        Update: Partial<Database['public']['Tables']['rescuers']['Insert']>
      }
      // 2. 마감 임박 구조 상품 - 기존 products 대체
      rescue_products: {
        Row: {
          id: string
          shop_id: string
          product_name: string
          category: string
          original_price: number
          rescue_price: number
          discount_rate: number | null
          stock_quantity: number
          expire_datetime: string | null
          image_url: string | null
          description: string | null
          status: 'active' | 'rescued' | 'expired'
          is_rescued: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['rescue_products']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['rescue_products']['Insert']>
      }
      // 3. 구조대 협력 지점
      shops: {
        Row: {
          id: string
          owner_id: string
          shop_name: string
          category: string
          latitude: number
          longitude: number
          address: string
          phone: string
          description: string | null
          logo_image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['shops']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['shops']['Insert']>
      }
      banners: {
        Row: {
          id: string
          title: string
          image_url: string
          link_url: string
          active: boolean
          type: string | null
          shop_name: string | null
          end_date: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['banners']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['banners']['Insert']>
      }
      // 4. 실시간 구조 통계
      daily_stats: {
        Row: {
          id: string
          date: string
          total_rescued_items: number
          total_rescued_amount: number
          created_at: string
        }
      }
    }
  }
}
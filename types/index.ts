export type ShopApprovalStatus = 'pending' | 'approved' | 'rejected'
export type ShopCategory = '과일' | '야채' | '축산' | '수산' | '공산품' | '베이커리' | '식당' | '기타'
export type FilterType = 'nearest' | 'recommended'

export interface Shop {
  id: string
  name: string
  category: ShopCategory
  lat: number
  lng: number
  address: string
  image: string
  status: ShopApprovalStatus
  phone?: string
  description?: string
}

export interface Product {
  id: string
  shopId: string
  name: string
  originalPrice: number
  rescuePrice: number
  stock: number
  expireTime: string // ISO string
  image?: string
}

// ── Supabase DB row shape (seller dashboard 전용) ──────────────
export interface DbShop {
  id: string
  owner_id: string
  shop_name: string
  category: ShopCategory
  latitude: number | null
  longitude: number | null
  address: string
  road_address: string | null
  address_detail: string | null
  phone: string | null
  description: string | null
  owner_name: string | null
  business_number: string | null
  business_registration_url: string | null
  shop_image_url: string | null
  is_active: boolean
  status: ShopApprovalStatus
  created_at: string
  updated_at: string | null
}

// ── 인증 / 사용자 ──────────────────────────────────────────────
export type UserRole = 'user' | 'seller' | 'admin'
export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export interface Profile {
  id: string
  phone: string | null
  role: UserRole
  seller_status: SellerStatus | null  // 사장님 계정 승인 상태
  nickname?: string | null
  avatar_url?: string | null
  marketing_agree: boolean
  marketing_agreed_at: string | null  // ISO timestamp — 개인정보법 법적 증빙용
  rescue_count?: number
  is_registered?: boolean
  created_at: string
  updated_at: string
}

// ── 예약 / 리뷰 / 랭킹 ────────────────────────────────────────
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

export interface Reservation {
  id: string
  user_id: string
  product_id: string
  shop_id: string
  status: ReservationStatus
  quantity: number
  user_nickname?: string
  product_name?: string
  pickup_completed_at?: string
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  reservation_id: string
  user_id: string
  shop_id: string
  product_id?: string
  rating: number
  freshness_score: number
  comment?: string
  photo_url?: string
  is_auto_comment?: boolean
  time_weight?: number
  weighted_score?: number
  created_at: string
}

export interface ShopRanking {
  shop_id: string
  shop_name?: string
  total_weighted_score: number
  review_count: number
  avg_rating: number
  rank_position?: number
  updated_at: string
}

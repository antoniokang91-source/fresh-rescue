'use client'

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/layout/Header'
import EmergencyCounter from '@/components/home/EmergencyCounter'
import FilterBar from '@/components/home/FilterBar'
import ShopDrawer from '@/components/home/ShopDrawer'
import SearchBar from '@/components/home/SearchBar'
import AuthModal from '@/components/auth/AuthModal'
// 🟢 Supabase 라이브러리 추가
import { supabase } from '@/lib/supabase' 
import { isUrgent } from '@/lib/utils'

// SSR 비활성화 — 카카오 지도는 브라우저에서만 동작
const KakaoMap = dynamic(() => import('@/components/map/KakaoMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 gap-3">
      <div className="relative">
        <div className="text-5xl animate-bounce">🚑</div>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-siren-red rounded-full animate-ping" />
      </div>
      <p className="text-gray-500 text-sm font-bold">구조대 출동 준비 중...</p>
    </div>
  ),
})

export default function HomePage() {
  const [selectedShop, setSelectedShop] = useState<any | null>(null)
  const [filter, setFilter] = useState<string>('nearest')
  const [searchQuery, setSearchQuery] = useState('')
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  
  // 🟢 실시간 상태 관리를 위한 State 추가
  const [realtimeShops, setRealtimeShops] = useState<any[]>([])
  const [realtimeProducts, setRealtimeProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ── 데이터 페칭: 승인된 가게 전체 + 활성 상품 ──
  useEffect(() => {
    const fetchData = async () => {
      // 1. 승인된 가게 전체 (상품 유무 무관)
      const { data: shopsData } = await supabase
        .from('shops')
        .select('*')
        .eq('status', 'approved')
        .eq('is_active', true)

      // DB 필드 → Shop 타입 매핑
      const mappedShops = (shopsData ?? [])
        .filter((s: any) => s.latitude && s.longitude)
        .map((s: any) => ({
          id: s.id,
          name: s.shop_name,
          category: s.category,
          lat: s.latitude,
          lng: s.longitude,
          address: s.address,
          image: s.shop_image_url ?? '',
          status: s.status,
          phone: s.phone,
          description: s.description,
        }))
      setRealtimeShops(mappedShops)

      // 2. 활성 상품 — DB 필드 → Product 타입 매핑
      const { data: productsData } = await supabase
        .from('rescue_products')
        .select('*')
        .eq('status', 'active')

      const mappedProducts = (productsData ?? []).map((p: any) => ({
        id: p.id,
        shopId: p.shop_id,
        name: p.product_name,
        originalPrice: p.original_price,
        rescuePrice: p.rescue_price,
        stock: p.stock_quantity,
        expireTime: p.expire_datetime,
        image: p.image_url ?? undefined,
      }))
      setRealtimeProducts(mappedProducts)

      setLoading(false)
    }

    fetchData()

    // 실시간 구독
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rescue_products' }, fetchData)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shops' }, fetchData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── 정렬 및 검색 로직 (기본 로직 유지하되 데이터 원본 교체) ──
  const sortedShops = useMemo(() => {
    const shops = [...realtimeShops]
    
    // 거리순 또는 할인율순 정렬 (DB의 데이터 구조에 맞춤)
    return shops.sort((a, b) => {
      if (filter === 'nearest') {
        // 실제 거리 계산 로직은 KakaoMap 내부에 위치하거나 유틸 함수 활용 가능
        return 0 
      }
      return 0 // 필터별 정렬 로직 적용 지점
    })
  }, [filter, realtimeShops])

  const { filteredShops, isSearchActive } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return { filteredShops: sortedShops, isSearchActive: false }

    const matchedShops = sortedShops.filter(s => 
      s.name.toLowerCase().includes(query) ||
      realtimeProducts.some(p => p.shopId === s.id && p.name.toLowerCase().includes(query))
    )
    
    return { filteredShops: matchedShops, isSearchActive: true }
  }, [searchQuery, sortedShops, realtimeProducts])

  // ── 긴급 상품 카운트 (DB 데이터 기준) ──
  const urgentCount = useMemo(
    () => realtimeProducts.filter((p) => isUrgent(p.expireTime)).length,
    [realtimeProducts]
  )

  return (
    <main className="h-dvh flex flex-col overflow-hidden bg-gray-100">
      {/* ① 실시간 전광판 (DB 트리거와 연동됨) */}
      <EmergencyCounter />

      <Header />

      <div className="flex-1 relative overflow-hidden">
        {/* ② 실시간 지도 (Mock 대신 실시간 데이터 주입) */}
        {!loading && (
          <KakaoMap
            shops={filteredShops}
            products={realtimeProducts}
            onShopSelect={(shop: any) => setSelectedShop(shop)}
            selectedShopId={selectedShop?.id}
            isSearchActive={isSearchActive}
          />
        )}

        {/* ③ 검색 바 */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          resultCount={filteredShops.length}
        />

        {/* 긴급 알림 뱃지 */}
        {urgentCount > 0 && !isSearchActive && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-siren-red text-white text-xs font-black px-4 py-2 rounded-full shadow-xl animate-siren-pulse flex items-center gap-2">
              <span>🚨</span>
              <span>긴급 구조 {urgentCount}건 작전 수행 중!</span>
            </div>
          </div>
        )}

        <div className="absolute bottom-3 right-3 z-10 bg-white/80 backdrop-blur-sm rounded-xl px-3 py-2 text-xs text-gray-500 shadow-sm pointer-events-none">
          📌 마감 임박 지점을 확인하세요
        </div>
      </div>

      <FilterBar activeFilter={filter} onFilterChange={setFilter} />

      {/* ⑤ 바텀 드로어 (선택된 가게의 실시간 상품 표시) */}
      {selectedShop && (
        <ShopDrawer
          shop={selectedShop}
          products={realtimeProducts.filter(p => p.shopId === selectedShop.id)}
          onClose={() => setSelectedShop(null)}
        />
      )}

      {isJoinModalOpen && (
        <AuthModal onClose={() => setIsJoinModalOpen(false)} initialTab="join" />
      )}
    </main>
  )
}
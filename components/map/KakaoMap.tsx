'use client'

import { useEffect, useRef, useState } from 'react'
import { Shop, Product } from '@/types'
import { isUrgent, isCritical, getDiscountRate } from '@/lib/utils'

// 카카오 맵 전역 타입
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kakao: any
  }
}

const CATEGORY_EMOJI: Record<string, string> = {
  과일: '🍎',
  축산: '🥩',
  야채: '🥬',
  수산: '🐟',
  공산품: '🛒',
}

interface KakaoMapProps {
  shops: Shop[]
  products: Product[]
  onShopSelect: (shop: Shop) => void
  selectedShopId?: string
  isSearchActive?: boolean // 검색 활성 시 마커에 bounce 효과
}

export default function KakaoMap({ shops, products, onShopSelect, selectedShopId, isSearchActive }: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysRef = useRef<any[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [noKey, setNoKey] = useState(false)

  // ── 지도 초기화 ──────────────────────────────────────────────────────────
  useEffect(() => {
    let attempts = 0
    const MAX_ATTEMPTS = 80 // 8초

    const tryInit = () => {
      if (!window.kakao?.maps) {
        attempts++
        if (attempts >= MAX_ATTEMPTS) {
          setNoKey(true)
          return
        }
        setTimeout(tryInit, 100)
        return
      }

      window.kakao.maps.load(() => {
        if (!mapRef.current) return

        const map = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(37.5665, 126.978),
          level: 4,
        })
        mapInstance.current = map

        // 현재 위치로 이동
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
              map.setCenter(
                new window.kakao.maps.LatLng(coords.latitude, coords.longitude)
              )
              // 내 위치 마커
              const myMarkerEl = document.createElement('div')
              myMarkerEl.innerHTML = buildMyLocationHTML()
              new window.kakao.maps.CustomOverlay({
                position: new window.kakao.maps.LatLng(coords.latitude, coords.longitude),
                content: myMarkerEl,
                yAnchor: 1,
                zIndex: 20,
              }).setMap(map)
            },
            () => {} // 위치 거부 시 무시
          )
        }

        setIsLoaded(true)
      })
    }

    tryInit()
  }, [])

  // ── 마커 업데이트 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !mapInstance.current) return

    // 기존 오버레이 제거
    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    shops.forEach((shop) => {
      const shopProducts = products.filter((p) => p.shopId === shop.id)
      const hasUrgent = shopProducts.some((p) => isUrgent(p.expireTime))
      const hasCritical = shopProducts.some((p) => isCritical(p.expireTime))
      const maxDiscount = shopProducts.length
        ? Math.max(...shopProducts.map(getDiscountRate))
        : 0
      const isSelected = shop.id === selectedShopId
      const emoji = CATEGORY_EMOJI[shop.category] ?? '🏪'

      const el = document.createElement('div')
      el.innerHTML = buildMarkerHTML(
        emoji, shop.name, hasUrgent, hasCritical, isSelected, maxDiscount,
        isSearchActive ?? false
      )
      el.style.cursor = 'pointer'
      el.addEventListener('click', () => onShopSelect(shop))

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(shop.lat, shop.lng),
        content: el,
        yAnchor: 1,
        zIndex: isSelected ? 10 : hasCritical ? 5 : 1,
      })
      overlay.setMap(mapInstance.current)
      overlaysRef.current.push(overlay)
    })
  }, [isLoaded, shops, products, selectedShopId, onShopSelect, isSearchActive])

  // ── API 키 없을 때 Fallback UI ────────────────────────────────────────────
  if (noKey) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-red-50 gap-4 p-8">
        <div className="text-6xl">🗺️</div>
        <div className="text-center">
          <p className="font-black text-gray-700 text-lg">지도를 불러올 수 없어요</p>
          <p className="text-sm text-gray-500 mt-1">카카오 지도 API 키가 필요합니다</p>
        </div>
        <div className="bg-white rounded-2xl p-4 text-xs text-gray-600 shadow-sm w-full max-w-sm font-mono">
          <p className="font-bold text-gray-800 mb-2">📋 설정 방법</p>
          <p>1. <a href="https://developers.kakao.com" className="text-blue-500">developers.kakao.com</a> 에서 앱 생성</p>
          <p className="mt-1">2. <code className="bg-gray-100 px-1 rounded">.env.local</code> 파일 생성:</p>
          <p className="bg-gray-900 text-green-400 rounded-lg p-2 mt-1">
            NEXT_PUBLIC_KAKAO_MAP_KEY=발급받은_키
          </p>
          <p className="mt-1">3. 서버 재시작: <code className="bg-gray-100 px-1 rounded">npm run dev</code></p>
        </div>

        {/* 목업 핀들 */}
        <div className="flex gap-3 flex-wrap justify-center mt-2">
          {['🍎 행복과일', '🥩 싱싱축산', '🥬 푸른들', '🐟 바다향'].map((label) => (
            <div
              key={label}
              className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm text-xs font-bold text-gray-700"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return <div ref={mapRef} className="w-full h-full" />
}

// ── 마커 HTML 생성 ────────────────────────────────────────────────────────────

function buildMarkerHTML(
  emoji: string,
  name: string,
  urgent: boolean,
  critical: boolean,
  selected: boolean,
  discount: number,
  bouncing: boolean
): string {
  const bg = selected
    ? '#FF3B30'
    : critical
    ? '#FF3B30'
    : urgent
    ? '#FF6B35'
    : '#1C1C1E'

  const circleScale = selected ? 'transform: scale(1.2);' : ''

  const pulseStyle = critical
    ? 'animation: rescuePulse 0.7s ease-in-out infinite;'
    : urgent
    ? 'animation: rescuePulse 1.2s ease-in-out infinite;'
    : ''

  // 검색 활성 시 bounce — selected 여부에 따라 scale 보존
  const bounceAnim = bouncing
    ? selected
      ? 'animation: bounceMarkerSelected 0.6s ease-in-out infinite;'
      : 'animation: bounceMarker 0.6s ease-in-out infinite;'
    : ''

  return `
    <div style="
      display:flex; flex-direction:column; align-items:center;
      user-select:none; pointer-events:auto;
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.28));
      ${bounceAnim}
      transition: transform 0.2s;
    ">
      <!-- 원형 아이콘 — scale은 circle에 적용 (bounce와 분리) -->
      <div style="
        position:relative; width:48px; height:48px;
        background:${bg}; border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        font-size:24px; border:3px solid white;
        ${circleScale}
        ${pulseStyle}
      ">
        ${emoji}

        ${/* 긴급 빨간 점 */(urgent || critical) ? `
          <div style="
            position:absolute; top:-3px; right:-3px;
            width:14px; height:14px;
            background:#FF3B30; border-radius:50%;
            border:2px solid white;
          "></div>
        ` : ''}

        ${/* 할인율 배지 */discount > 0 ? `
          <div style="
            position:absolute; bottom:-6px; right:-6px;
            background:#FFD600; color:#1C1C1E;
            font-size:9px; font-weight:900;
            padding:1px 4px; border-radius:8px;
            border:1.5px solid white; white-space:nowrap;
            font-family:-apple-system,sans-serif;
          ">${discount}%↓</div>
        ` : ''}
      </div>

      <!-- 이름 라벨 -->
      <div style="
        background:${bg}; color:white;
        font-size:11px; font-weight:700;
        padding:3px 9px; border-radius:20px;
        margin-top:4px; white-space:nowrap;
        max-width:80px; overflow:hidden; text-overflow:ellipsis;
        font-family:-apple-system,sans-serif;
      ">${name}</div>

      <!-- 핀 꼬리 -->
      <div style="width:2px; height:9px; background:${bg}; border-radius:0 0 2px 2px;"></div>
    </div>
  `
}

function buildMyLocationHTML(): string {
  return `
    <div style="
      position:relative; width:20px; height:20px;
      display:flex; align-items:center; justify-content:center;
      transform: translate(-50%, -50%);
    ">
      <div style="
        position:absolute; width:40px; height:40px;
        background:rgba(59,130,246,0.15); border-radius:50%;
        animation: rescuePulse 2s ease-in-out infinite;
      "></div>
      <div style="
        width:14px; height:14px;
        background:#3B82F6; border-radius:50%;
        border:3px solid white;
        box-shadow: 0 2px 8px rgba(59,130,246,0.6);
      "></div>
    </div>
  `
}

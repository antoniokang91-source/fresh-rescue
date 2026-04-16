'use client'

import { useEffect, useState } from 'react'
import { X, Navigation, Phone } from 'lucide-react'
import { Shop, Product } from '@/types'
import { formatPrice, getDiscountRate, timeUntilExpiry, isUrgent, isCritical } from '@/lib/utils'

interface ShopDrawerProps {
  shop: Shop
  products: Product[]
  onClose: () => void
}

export default function ShopDrawer({ shop, products, onClose }: ShopDrawerProps) {
  const shopProducts = products.filter((p) => p.shopId === shop.id)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 한 프레임 후 트랜지션 시작
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const kakaoNavUrl = `https://map.kakao.com/link/to/${encodeURIComponent(shop.name)},${shop.lat},${shop.lng}`

  return (
    <>
      {/* 딤 배경 */}
      <div
        className={`fixed inset-0 z-40 bg-black transition-opacity duration-300 ${
          visible ? 'opacity-30' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* 바텀 시트 */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '72vh' }}
      >
        {/* 핸들 바 */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* 닫기 버튼 */}
        <button
          className="absolute top-3 right-4 text-gray-300 hover:text-gray-500 transition-colors"
          onClick={handleClose}
        >
          <X size={22} />
        </button>

        {/* 가게 헤더 */}
        <div className="px-5 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start gap-3">
            {/* 가게 이미지 */}
            <img
              src={shop.image}
              alt={shop.name}
              className="w-16 h-16 rounded-2xl object-cover shrink-0 bg-gray-100"
              onError={(e) => {
                ;(e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=60'
              }}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-lg text-gray-900 leading-tight">{shop.name}</h2>
                <span className="text-[11px] bg-green-100 text-rescue-orange px-2 py-0.5 rounded-full font-bold shrink-0">
                  {shop.category}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <span>📍</span>
                <span className="truncate">{shop.address}</span>
              </p>
              {shop.phone && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Phone size={10} />
                  {shop.phone}
                </p>
              )}
              {shop.description && (
                <p className="text-xs text-gray-500 mt-1.5">{shop.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* 상품 리스트 */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            🚨 구조 대기 상품 {shopProducts.length}건
          </h3>

          {shopProducts.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">등록된 구조 상품이 없습니다</p>
            </div>
          )}

          <div className="space-y-3">
            {shopProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>

        {/* CTA 버튼 */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0 bg-white">
          <a
            href={kakaoNavUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 bg-rescue-orange text-white font-black text-base rounded-2xl shadow-lg shadow-green-200 active:scale-95 transition-transform"
          >
            <Navigation size={18} />
            지금 바로 출동하기!
          </a>
        </div>
      </div>
    </>
  )
}

function ProductCard({ product }: { product: Product }) {
  const [timeLeft, setTimeLeft] = useState(() => timeUntilExpiry(product.expireTime))
  const urgent = isUrgent(product.expireTime)
  const critical = isCritical(product.expireTime)
  const discount = getDiscountRate(product)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(timeUntilExpiry(product.expireTime))
    }, 1000)
    return () => clearInterval(timer)
  }, [product.expireTime])

  return (
    <div
      className={`rounded-2xl border-2 p-3.5 transition-all ${
        critical
          ? 'border-siren-red bg-red-50 animate-blink-urgent'
          : urgent
          ? 'border-green-300 bg-green-50'
          : 'border-gray-100 bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">{product.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-lg font-black text-rescue-orange">
              {formatPrice(product.rescuePrice)}
            </span>
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.originalPrice)}
            </span>
            <span className="text-[11px] bg-siren-red text-white px-1.5 py-0.5 rounded-md font-black">
              -{discount}%
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div
            className={`text-sm font-black tabular-nums ${
              critical ? 'text-siren-red' : urgent ? 'text-rescue-orange' : 'text-gray-500'
            }`}
          >
            ⏱ {timeLeft}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">재고 {product.stock}개</div>
        </div>
      </div>
    </div>
  )
}

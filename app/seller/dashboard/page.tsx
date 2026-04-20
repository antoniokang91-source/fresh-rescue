'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Clock, Package, X,
  LogIn, Store, Edit3, MapPin, CheckCircle2, ImageIcon, FileText, Pencil,
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { formatPrice, timeUntilExpiry } from '@/lib/utils'
import AuthModal from '@/components/auth/AuthModal'
import type { DbShop, ShopCategory } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductForm {
  product_name: string;
  category: string;
  original_price: string;
  rescue_price: string;
  stock_quantity: string;
  expire_hours: string;
  image_url: string;
}


interface ShopForm {
  shop_name: string
  category: ShopCategory
  description: string
  owner_name: string
  business_number: string
  phone: string
  address: string
  road_address: string
  address_detail: string
  latitude: number | null
  longitude: number | null
}

const INITIAL_PRODUCT_FORM: ProductForm = {
  product_name: '',
  category: '',
  original_price: '',
  rescue_price: '',
  stock_quantity: '',
  expire_hours: '',
  image_url: '',
}

const INITIAL_SHOP_FORM: ShopForm = {
  shop_name: '',
  category: '과일',
  description: '',
  owner_name: '',
  business_number: '',
  phone: '',
  address: '',
  road_address: '',
  address_detail: '',
  latitude: null,
  longitude: null,
}

const CATEGORIES: ShopCategory[] = ['과일', '야채', '축산', '수산', '공산품', '베이커리', '기타']

const CATEGORY_EMOJI: Record<ShopCategory, string> = {
  과일: '🍎', 야채: '🥬', 축산: '🥩', 수산: '🐟', 공산품: '🛒', 베이커리: '🍞', 기타: '🏪',
}

// ─── Daum Postcode loader ─────────────────────────────────────────────────────

declare global {
  interface Window {
    kakao: any
    daum: any
  }
}

const loadDaumPostcode = (): Promise<void> =>
  new Promise((resolve) => {
    if (window.daum?.Postcode) { resolve(); return }
    const s = document.createElement('script')
    s.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    s.onload = () => resolve()
    document.head.appendChild(s)
  })

const geocodeAddress = (address: string): Promise<{ lat: number; lng: number } | null> =>
  new Promise((resolve) => {
    const tryGeocode = () => {
      if (!window.kakao?.maps?.services?.Geocoder) { resolve(null); return }
      const geocoder = new window.kakao.maps.services.Geocoder()
      geocoder.addressSearch(address, (result: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) })
        } else {
          resolve(null)
        }
      })
    }
    if (window.kakao?.maps?.load) {
      window.kakao.maps.load(tryGeocode)
    } else {
      tryGeocode()
    }
  })

// ─── 이미지 압축 (Canvas API, 추가 라이브러리 불필요) ────────────────────────
const compressImage = (file: File, maxWidth = 1280, quality = 0.82): Promise<File> =>
  new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(file); return }
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onerror = () => resolve(file)
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
      img.onload = () => {
        try {
          let { width, height } = img
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) { resolve(file); return }
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (!blob) { resolve(file); return }
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
            },
            'image/jpeg',
            quality
          )
        } catch {
          resolve(file)
        }
      }
    }
  })

// ─── File upload helper ───────────────────────────────────────────────────────
const uploadFile = async (file: File, bucket: string, userId: string): Promise<string> => {
  const compressed = await compressImage(file)
  const ext = compressed.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${ext}`
  const { data, error } = await supabase.storage.from(bucket).upload(path, compressed, { upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return urlData.publicUrl
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SellerDashboardPage() {
  const { user, profile, isLoading } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  const [shop, setShop] = useState<DbShop | null | undefined>(undefined) // undefined = loading
  const [products, setProducts] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'shop' | 'products'>('shop')

  const [showShopSheet, setShowShopSheet] = useState(false)
  const [shopForm, setShopForm] = useState<ShopForm>(INITIAL_SHOP_FORM)
  const [shopImageFile, setShopImageFile] = useState<File | null>(null)
  const [shopImagePreview, setShopImagePreview] = useState<string>('')
  const [bizDocFile, setBizDocFile] = useState<File | null>(null)
  const [bizDocName, setBizDocName] = useState('')
  const [shopSaving, setShopSaving] = useState(false)
  const [shopError, setShopError] = useState('')

  const [showProductSheet, setShowProductSheet] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productForm, setProductForm] = useState<ProductForm>(INITIAL_PRODUCT_FORM)
  const [productSaving, setProductSaving] = useState(false)
  const [productError, setProductError] = useState('')

  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Fetch shop & products ──────────────────────────────────────────────────
  const fetchShop = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()
    setShop(data as DbShop | null)
  }, [user])

  const fetchProducts = useCallback(async () => {
    if (!shop?.id) return
    const { data } = await supabase
      .from('rescue_products')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
    setProducts(data ?? [])
  }, [shop?.id])

  useEffect(() => { if (user) fetchShop() }, [user, fetchShop])
  useEffect(() => { if (shop) fetchProducts() }, [shop, fetchProducts])

  // ── Guard: not logged in ──────────────────────────────────────────────────
  if (!isLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 gap-5">
        <div className="text-5xl">🔒</div>
        <h2 className="font-black text-xl text-gray-800 text-center">사장님 로그인이 필요합니다</h2>
        <p className="text-sm text-gray-500 text-center">상품을 관리하려면 사장님 계정으로 로그인해주세요.</p>
        <button
          onClick={() => setShowAuth(true)}
          className="flex items-center gap-2 bg-rescue-orange text-white px-6 py-3.5 rounded-2xl font-black shadow-lg shadow-green-200"
        >
          <LogIn size={18} /> 사장님 로그인
        </button>
        <Link href="/" className="text-sm text-gray-400 underline">메인으로 돌아가기</Link>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} initialRole="seller" initialTab="login" />}
      </div>
    )
  }

  // ── Guard: not a seller role ──────────────────────────────────────────────
  if (!isLoading && profile && profile.role !== 'seller') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 gap-5">
        <div className="text-5xl">🔒</div>
        <h2 className="font-black text-xl text-gray-800 text-center">사장님 전용 페이지입니다</h2>
        <p className="text-sm text-gray-500 text-center">사장님 계정으로 로그인해주세요.</p>
        <Link href="/" className="text-sm text-gray-400 underline">메인으로 돌아가기</Link>
      </div>
    )
  }

  // ── Guard: not approved (pending / rejected / null) ─────────────────────
  if (!isLoading && profile && profile.role === 'seller' && profile.seller_status !== 'approved') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 gap-5">
        <div className="text-5xl">{profile.seller_status === 'rejected' ? '❌' : '⏳'}</div>
        <h2 className="font-black text-xl text-gray-800 text-center">
          {profile.seller_status === 'rejected' ? '입점 신청이 반려되었습니다' : '입점 승인 대기 중'}
        </h2>
        <p className="text-sm text-gray-500 text-center">
          {profile.seller_status === 'rejected'
            ? '자세한 내용은 관리자에게 문의해주세요.'
            : '관리자가 입점을 승인하면 대시보드를 사용할 수 있습니다.'}
        </p>
        <Link href="/" className="text-sm text-gray-400 underline">메인으로 돌아가기</Link>
      </div>
    )
  }

  if (shop === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-bounce">🚑</div>
      </div>
    )
  }

  // ── Open shop form ─────────────────────────────────────────────────────────
  const openShopForm = () => {
    if (shop) {
      setShopForm({
        shop_name: shop.shop_name,
        category: shop.category,
        description: shop.description ?? '',
        owner_name: shop.owner_name ?? '',
        business_number: shop.business_number ?? '',
        phone: shop.phone ?? '',
        address: shop.address,
        road_address: shop.road_address ?? '',
        address_detail: shop.address_detail ?? '',
        latitude: shop.latitude,
        longitude: shop.longitude,
      })
      if (shop.shop_image_url) setShopImagePreview(shop.shop_image_url)
      if (shop.business_registration_url) setBizDocName('등록된 파일 있음')
    } else {
      setShopForm(INITIAL_SHOP_FORM)
      setShopImagePreview('')
      setBizDocName('')
    }
    setShopError('')
    setShowShopSheet(true)
  }

  // ── Address search ─────────────────────────────────────────────────────────
  const handleAddressSearch = async () => {
    await loadDaumPostcode()
    new window.daum.Postcode({
      oncomplete: async (data: any) => {
        const addr = data.roadAddress || data.jibunAddress
        const coords = await geocodeAddress(addr)
        setShopForm(prev => ({
          ...prev,
          address: addr,
          road_address: data.roadAddress ?? '',
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        }))
      },
    }).open()
  }

  // ── Save shop ──────────────────────────────────────────────────────────────
  const saveShop = async () => {
    if (!shopForm.shop_name.trim()) { setShopError('가게명을 입력해주세요.'); return }
    if (!shopForm.address.trim()) { setShopError('주소를 입력해주세요.'); return }
    setShopSaving(true)
    setShopError('')
    try {
      let shopImageUrl = shop?.shop_image_url ?? null
      let bizDocUrl = shop?.business_registration_url ?? null

      if (shopImageFile) {
        shopImageUrl = await uploadFile(shopImageFile, 'shop-images', user!.id)
      }
      if (bizDocFile) {
        bizDocUrl = await uploadFile(bizDocFile, 'business-docs', user!.id)
      }

      const payload = {
        owner_id: user!.id,
        shop_name: shopForm.shop_name,
        category: shopForm.category,
        description: shopForm.description || null,
        owner_name: shopForm.owner_name || null,
        business_number: shopForm.business_number || null,
        phone: shopForm.phone || null,
        address: shopForm.address,
        road_address: shopForm.road_address || null,
        address_detail: shopForm.address_detail || null,
        latitude: shopForm.latitude,
        longitude: shopForm.longitude,
        shop_image_url: shopImageUrl,
        business_registration_url: bizDocUrl,
        // 수정 시에는 is_active·status 유지, 신규 등록은 pending 대기
        ...(shop ? {} : { status: 'pending', is_active: false }),
        updated_at: new Date().toISOString(),
      }

      if (shop) {
        const { error } = await supabase.from('shops').update(payload).eq('id', shop.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('shops').insert(payload)
        if (error) throw error
        // 신규 등록 시 seller_status를 'pending'으로 설정
        await supabase
          .from('rescuers')
          .update({ seller_status: 'pending' })
          .eq('id', user!.id)
      }

      await fetchShop()
      setShowShopSheet(false)
      setShopImageFile(null)
      setBizDocFile(null)
    } catch (e: any) {
      console.error('saveShop error:', e)
      setShopError(e?.message || e?.error_description || '저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setShopSaving(false)
    }
  }

  // ── Save product ───────────────────────────────────────────────────────────
  const openProductSheet = (product?: any) => {
    if (product) {
      // 수정 모드
      setEditingProductId(product.id)
      setProductForm({
  product_name: product.product_name,
  category: product.category ?? '',
  original_price: String(product.original_price),
  rescue_price: String(product.rescue_price),
  stock_quantity: String(product.stock_quantity),
  expire_hours: '2',
  image_url: product.image_url ?? '',
})
    } else {
      // 신규 등록 모드
      setEditingProductId(null)
      setProductForm(INITIAL_PRODUCT_FORM)
    }
    setProductError('')
    setShowProductSheet(true)
  }

  const saveProduct = async () => {
    if (!productForm.product_name || !productForm.original_price || !productForm.rescue_price || !productForm.stock_quantity) {
      setProductError('필수 항목을 모두 입력해주세요.'); return
    }
    if (!shop) { setProductError('먼저 가게를 등록해주세요.'); return }
    setProductSaving(true)
    setProductError('')
    try {
      const payload = {
        product_name: productForm.product_name,
        category: shop.category,
        original_price: parseInt(productForm.original_price),
        rescue_price: parseInt(productForm.rescue_price),
        stock_quantity: parseInt(productForm.stock_quantity),
      }

      if (editingProductId) {
        // 수정
        const { error } = await supabase
          .from('rescue_products')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingProductId)
        if (error) throw error
      } else {
        // 신규 등록
        const expireDatetime = new Date(
          Date.now() + parseFloat(productForm.expire_hours) * 3600 * 1000
        ).toISOString()
        const { error } = await supabase.from('rescue_products').insert({
          shop_id: shop.id,
          ...payload,
          expire_datetime: expireDatetime,
          status: 'active',
        })
        if (error) throw error
      }

      await fetchProducts()
      setShowProductSheet(false)
    } catch (e: any) {
      setProductError(e.message || '저장에 실패했습니다.')
    } finally {
      setProductSaving(false)
    }
  }

  const deleteProduct = async (id: string) => {
    await supabase.from('rescue_products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 text-rescue-orange font-black text-lg">
          🚑 신선구조대
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">🏪 사장님</span>
          {profile?.phone && <span className="text-xs text-gray-400">••{profile.phone.slice(-4)}</span>}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Shop summary card */}
        <div className={`rounded-3xl p-5 text-white mb-5 shadow-lg ${shop ? 'bg-gradient-to-br from-rescue-orange to-green-600 shadow-green-200' : 'bg-gradient-to-br from-gray-500 to-gray-700'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{shop ? (CATEGORY_EMOJI[shop.category] ?? '🏪') : '🏪'}</span>
              <div>
                <h1 className="font-black text-xl leading-none">{shop?.shop_name ?? '가게 미등록'}</h1>
                <p className="text-green-200 text-xs mt-0.5 truncate max-w-[200px]">{shop?.address ?? '가게를 등록해주세요'}</p>
              </div>
            </div>
            <button
              onClick={openShopForm}
              className="bg-white/20 hover:bg-white/30 rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1"
            >
              <Edit3 size={11} />
              {shop ? '수정' : '등록'}
            </button>
          </div>
          {shop && (
            <>
              {/* 승인 상태 배지 */}
              {shop.status === 'pending' && (
                <div className="mt-3 bg-yellow-400/20 border border-yellow-300/40 rounded-2xl px-4 py-2.5 text-center">
                  <p className="text-yellow-200 font-black text-sm">⏳ 관리자 승인 대기 중</p>
                  <p className="text-yellow-300/70 text-[11px] mt-0.5">승인 완료 후 상품을 등록할 수 있어요</p>
                </div>
              )}
              {shop.status === 'rejected' && (
                <div className="mt-3 bg-red-500/20 border border-red-400/40 rounded-2xl px-4 py-2.5 text-center">
                  <p className="text-red-200 font-black text-sm">❌ 입점이 반려되었습니다</p>
                  <p className="text-red-300/70 text-[11px] mt-0.5">가게 정보를 수정 후 재신청해주세요</p>
                </div>
              )}
              {shop.status === 'approved' && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: '구조 대기', value: products.filter(p => p.status === 'active').length, unit: '건' },
                    { label: '등록 상품', value: products.length, unit: '개' },
                    { label: '가게 상태', value: shop.is_active ? '운영중' : '휴무', unit: '' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/20 rounded-2xl p-2.5 text-center">
                      <div className="font-black text-lg leading-none">
                        {stat.value}<span className="text-xs font-normal ml-0.5">{stat.unit}</span>
                      </div>
                      <div className="text-[10px] text-green-200 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
          <button
            onClick={() => setActiveTab('shop')}
            className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all ${activeTab === 'shop' ? 'bg-white text-rescue-orange shadow-sm' : 'text-gray-400'}`}
          >
            🏪 가게 정보
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all ${activeTab === 'products' ? 'bg-white text-rescue-orange shadow-sm' : 'text-gray-400'}`}
          >
            📦 상품 관리
          </button>
        </div>

        {/* ── 가게 정보 탭 ─────────────────────────────────────────────── */}
        {activeTab === 'shop' && (
          <div>
            {!shop ? (
              <div className="bg-white rounded-3xl p-6 text-center shadow-sm border-2 border-dashed border-green-200">
                <Store size={40} className="mx-auto text-green-300 mb-3" />
                <p className="font-black text-gray-800 text-lg mb-1">아직 가게가 없어요</p>
                <p className="text-sm text-gray-400 mb-4">
                  가게를 등록하면 지도에 핀이 꽂히고<br />마감 상품을 올릴 수 있어요!
                </p>
                <button
                  onClick={openShopForm}
                  className="bg-rescue-orange text-white px-6 py-3 rounded-2xl font-black shadow-md shadow-green-200"
                >
                  🏪 가게 등록하기
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <InfoCard label="가게명" value={shop.shop_name} />
                <InfoCard label="카테고리" value={`${CATEGORY_EMOJI[shop.category]} ${shop.category}`} />
                {shop.description && <InfoCard label="소개" value={shop.description} />}
                {shop.owner_name && <InfoCard label="대표자" value={shop.owner_name} />}
                {shop.business_number && <InfoCard label="사업자번호" value={shop.business_number} />}
                {shop.phone && <InfoCard label="전화번호" value={shop.phone} />}
                <InfoCard label="주소" value={shop.address + (shop.address_detail ? ` ${shop.address_detail}` : '')} />
                {shop.latitude && shop.longitude && (
                  <InfoCard label="좌표" value={`${shop.latitude.toFixed(5)}, ${shop.longitude.toFixed(5)}`} />
                )}
                {shop.shop_image_url && (
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                    <img src={shop.shop_image_url} alt="가게 사진" className="w-full h-40 object-cover" />
                  </div>
                )}
                {shop.business_registration_url && (
                  <a
                    href={shop.business_registration_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-white rounded-2xl p-3 shadow-sm text-sm text-blue-600 font-bold"
                  >
                    <FileText size={16} /> 사업자등록증 보기
                  </a>
                )}
                <button
                  onClick={openShopForm}
                  className="w-full py-3 border-2 border-rescue-orange text-rescue-orange font-black rounded-2xl flex items-center justify-center gap-2"
                >
                  <Edit3 size={15} /> 가게 정보 수정
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 상품 관리 탭 ─────────────────────────────────────────────── */}
        {activeTab === 'products' && (
          <div>
            {/* 미승인 상태 잠금 안내 */}
            {shop && shop.status !== 'approved' && (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">{shop.status === 'pending' ? '⏳' : '❌'}</div>
                <p className="font-black text-gray-700 text-base mb-1">
                  {shop.status === 'pending' ? '승인 대기 중입니다' : '입점이 반려되었습니다'}
                </p>
                <p className="text-sm text-gray-400">
                  {shop.status === 'pending'
                    ? '관리자 승인 후 상품을 등록할 수 있습니다'
                    : '가게 정보를 수정 후 재신청해주세요'}
                </p>
              </div>
            )}

            {shop?.status === 'approved' && (
            <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-gray-900 flex items-center gap-2">
                <Package size={18} className="text-rescue-orange" /> 구조 대기 상품
              </h2>
              <button
                onClick={() => openProductSheet()}
                className="flex items-center gap-1.5 bg-rescue-orange text-white px-4 py-2 rounded-xl font-black text-sm shadow-md shadow-green-200"
              >
                <Plus size={15} /> 상품 추가
              </button>
            </div>

            {!shop && (
              <div className="text-center py-8 text-gray-400 text-sm">
                먼저 가게를 등록해주세요
              </div>
            )}

            <div className="space-y-3">
              {products.length === 0 && shop && (
                <div className="text-center py-12 text-gray-400">
                  <Package size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">등록된 상품이 없습니다</p>
                  <p className="text-xs mt-1">상품 추가 버튼으로 긴급 구조 요청하세요!</p>
                </div>
              )}

              {products.map((p) => {
                const discount = Math.round(((p.original_price - p.rescue_price) / p.original_price) * 100)
                const timeLeft = timeUntilExpiry(p.expire_datetime)
                const isExpired = new Date(p.expire_datetime) < new Date()
                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${p.status === 'active' ? 'border-transparent' : 'border-gray-100'}`}
                  >
                    <div className="flex items-start gap-3">
                      {p.image_url && (
                        <img src={p.image_url} alt={p.product_name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{p.product_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-base font-black text-rescue-orange">{formatPrice(p.rescue_price)}</span>
                          <span className="text-xs text-gray-400 line-through">{formatPrice(p.original_price)}</span>
                          <span className="text-[11px] bg-siren-red text-white px-1 py-0.5 rounded font-black">-{discount}%</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {isExpired ? <span className="text-siren-red font-bold">만료됨</span> : timeLeft}
                          </span>
                          <span>재고 {p.stock_quantity}개</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {p.status === 'active' ? '판매중' : p.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => openProductSheet(p)}
                          className="flex items-center gap-1 text-xs bg-blue-500 text-white px-2.5 py-1.5 rounded-xl font-bold"
                        >
                          <Pencil size={11} /> 수정
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="flex items-center gap-1 text-xs text-red-400 border border-red-200 px-2.5 py-1.5 rounded-xl"
                        >
                          <Trash2 size={11} /> 삭제
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            </>
            )}
          </div>
        )}
      </div>

      {/* ── 가게 등록/수정 바텀 시트 ──────────────────────────────────── */}
      {showShopSheet && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowShopSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-6 py-3 flex-shrink-0">
              <h3 className="font-black text-lg text-gray-900">{shop ? '🏪 가게 정보 수정' : '🏪 가게 등록'}</h3>
              <button className="text-gray-300 hover:text-gray-500" onClick={() => setShowShopSheet(false)}>
                <X size={22} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 pb-6 flex-1">
              <div className="space-y-4">
                {/* 가게 사진 */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">📸 가게 대표 사진</label>
                  <label className="block cursor-pointer">
                    {shopImagePreview ? (
                      <div className="relative">
                        <img src={shopImagePreview} alt="미리보기" className="w-full h-40 object-cover rounded-2xl" />
                        <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center">
                          <p className="text-white text-xs font-bold">클릭해서 변경</p>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center py-8 hover:border-rescue-orange transition-colors">
                        <ImageIcon size={28} className="text-gray-300 mb-2" />
                        <p className="text-xs text-gray-400 font-bold">가게 사진 업로드</p>
                        <p className="text-[10px] text-gray-300 mt-1">JPG, PNG 권장</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) { setShopImageFile(file); setShopImagePreview(URL.createObjectURL(file)) }
                      }}
                    />
                  </label>
                </div>

                {/* 가게명 */}
                <FormField label="가게명 *" value={shopForm.shop_name} onChange={v => setShopForm(p => ({ ...p, shop_name: v }))} placeholder="예: 행복과일마트" />

                {/* 카테고리 */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">카테고리 *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setShopForm(p => ({ ...p, category: c }))}
                        className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${shopForm.category === c ? 'border-rescue-orange bg-green-50 text-rescue-orange' : 'border-gray-200 text-gray-600'}`}
                      >
                        {CATEGORY_EMOJI[c]} {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 가게 소개 */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">가게 소개</label>
                  <textarea
                    value={shopForm.description}
                    onChange={e => setShopForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="가게를 소개해주세요 (최대 200자)"
                    maxLength={200}
                    rows={3}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rescue-orange transition-colors resize-none"
                  />
                </div>

                {/* 주소 */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">📍 가게 주소 *</label>
                  <button
                    type="button"
                    onClick={handleAddressSearch}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm text-left flex items-center justify-between hover:border-rescue-orange transition-colors mb-2"
                  >
                    <span className={shopForm.address ? 'text-gray-900 font-bold' : 'text-gray-400'}>
                      {shopForm.address || '주소 검색 (클릭)'}
                    </span>
                    <MapPin size={16} className="text-rescue-orange flex-shrink-0" />
                  </button>
                  {shopForm.address && (
                    <>
                      <input
                        type="text"
                        value={shopForm.address_detail}
                        onChange={e => setShopForm(p => ({ ...p, address_detail: e.target.value }))}
                        placeholder="상세 주소 (동/호수 등)"
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rescue-orange transition-colors"
                      />
                      {shopForm.latitude && (
                        <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                          <CheckCircle2 size={11} /> 좌표 자동 인식 완료 — 지도에 핀이 꽂힙니다
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* 전화번호 */}
                <FormField label="가게 전화번호" value={shopForm.phone} onChange={v => setShopForm(p => ({ ...p, phone: v }))} placeholder="02-1234-5678" type="tel" />

                {/* 대표자명 */}
                <FormField label="대표자명" value={shopForm.owner_name} onChange={v => setShopForm(p => ({ ...p, owner_name: v }))} placeholder="홍길동" />

                {/* 사업자등록번호 */}
                <FormField label="사업자등록번호" value={shopForm.business_number} onChange={v => setShopForm(p => ({ ...p, business_number: v }))} placeholder="000-00-00000" />

                {/* 사업자등록증 */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">📄 사업자등록증 첨부</label>
                  <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-rescue-orange transition-colors">
                    <FileText size={20} className="text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-700">{bizDocFile?.name || bizDocName || '파일 선택'}</p>
                      <p className="text-[10px] text-gray-400">PDF, JPG, PNG</p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) { setBizDocFile(file); setBizDocName(file.name) }
                      }}
                    />
                  </label>
                </div>

                {shopError && <p className="text-xs text-red-500">{shopError}</p>}

                <button
                  onClick={saveShop}
                  disabled={shopSaving}
                  className="w-full py-4 bg-rescue-orange text-white font-black text-base rounded-2xl shadow-lg shadow-green-200 disabled:opacity-40 active:scale-95 transition-all"
                >
                  {shopSaving ? '저장 중...' : shop ? '가게 정보 저장하기' : '가게 등록 완료하기 🎉'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── 상품 추가 바텀 시트 ────────────────────────────────────────── */}
      {showProductSheet && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowProductSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-6 py-3 flex-shrink-0">
              <h3 className="font-black text-lg text-gray-900">
                {editingProductId ? '📦 상품 수정' : '🚨 긴급 구조 상품 등록'}
              </h3>
              <button className="text-gray-300 hover:text-gray-500" onClick={() => setShowProductSheet(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 pb-6 flex-1">
              <div className="space-y-3">
                <FormField label="상품명 *" value={productForm.product_name} onChange={v => setProductForm(p => ({ ...p, product_name: v }))} placeholder="예: 사과 3kg 박스" />
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="정가 (원) *" value={productForm.original_price} onChange={v => setProductForm(p => ({ ...p, original_price: v }))} placeholder="15000" type="number" />
                  <FormField label="구조가 (원) *" value={productForm.rescue_price} onChange={v => setProductForm(p => ({ ...p, rescue_price: v }))} placeholder="5000" type="number" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="재고 수량 *" value={productForm.stock_quantity} onChange={v => setProductForm(p => ({ ...p, stock_quantity: v }))} placeholder="10" type="number" />
                  {!editingProductId && (
                    <FormField label="마감 (시간 후)" value={productForm.expire_hours} onChange={v => setProductForm(p => ({ ...p, expire_hours: v }))} placeholder="2" type="number" />
                  )}
                </div>

                {productForm.original_price && productForm.rescue_price && (
                  <div className="bg-green-50 rounded-xl px-4 py-2 text-sm text-rescue-orange font-black">
                    할인율: {Math.round(((parseInt(productForm.original_price) - parseInt(productForm.rescue_price)) / parseInt(productForm.original_price)) * 100)}%
                  </div>
                )}

                {productError && <p className="text-xs text-red-500">{productError}</p>}

                <button
                  onClick={saveProduct}
                  disabled={productSaving || !productForm.product_name || !productForm.original_price || !productForm.rescue_price}
                  className="w-full py-4 bg-rescue-orange text-white font-black text-base rounded-2xl shadow-lg shadow-green-200 disabled:opacity-40 active:scale-95 transition-all"
                >
                  {productSaving ? '저장 중...' : editingProductId ? '수정 완료' : '구조 요청 등록하기 🚨'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
      <span className="text-xs text-gray-400 font-bold w-20 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-bold text-right flex-1">{value}</span>
    </div>
  )
}

function FormField({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rescue-orange transition-colors"
      />
    </div>
  )
}

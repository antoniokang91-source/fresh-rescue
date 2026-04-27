'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, XCircle, Users, Megaphone, Store, BarChart3,
  Eye, EyeOff, LogOut, Plus, Trash2, Edit3, Upload, X,
  ExternalLink, ToggleLeft, ToggleRight, Search, MapPin, Package,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

type Tab = 'approval' | 'ads' | 'stats'
type AdsSubTab = 'banner' | 'pin' | 'search'

const SUPABASE_URL = 'https://utcqwesokcvlvwahomjj.supabase.co'

interface MarketingStats {
  total_users: number
  marketing_agreed: number
  total_sellers: number
  agree_rate_pct: number
}

interface DashboardStats {
  total_members: number
  total_sellers_approved: number
  total_sellers_pending: number
  total_shops: number
  active_products: number
  active_banners: number
  active_pin_ads: number
  search_ad_shops: number
}

interface BannerAd {
  id: string
  title: string
  image_url: string
  link_url: string
  is_active: boolean
  end_date: string | null
  sort_order: number
  shop_name: string | null
  type: string | null
}

interface BannerForm {
  title: string
  image_url: string
  link_url: string
  is_active: boolean
  end_date: string
  sort_order: number
}

interface PinAd {
  id: string
  shop_id: string | null
  shop_name: string
  end_date: string | null
  is_active: boolean
  created_at: string
}

interface ShopRow {
  id: string
  shop_name: string
  category: string
  is_search_ad: boolean
  address: string | null
}

interface PendingSeller {
  id: string
  nickname: string
  phone: string | null
  seller_status: string
  created_at: string
}

interface MemberRow {
  id: string
  nickname: string | null
  phone: string | null
  role: string
  seller_status: string | null
  created_at: string
}

// ── 관리자 전용 로그인 폼 ─────────────────────────────────────────────────────
function AdminLoginForm() {
  const { refreshProfile } = useAuth()
  const [adminId, setAdminId] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminId.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 입력해주세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const email = `${adminId.trim()}@fruitrescue.app`
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError || !data.user) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.')
        return
      }
      const { data: profileData } = await supabase
        .from('members')
        .select('role')
        .eq('id', data.user.id)
        .single()
      if (profileData?.role !== 'admin') {
        await supabase.auth.signOut()
        setError('관리자 권한이 없는 계정입니다.')
        return
      }
      await refreshProfile()
    } catch {
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-dark-base overflow-y-auto flex items-center justify-center px-6" style={{ height: '100dvh' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <img src="/logo.svg" alt="신선구조대" className="w-20 h-20 mx-auto mb-3" />
          <h1 className="text-white font-black text-2xl tracking-tight">
            신선구조대 <span className="text-rescue-orange">HQ</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">관리자 전용 페이지</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white/5 border border-white/10 rounded-3xl p-7 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">관리자 아이디</label>
            <input
              type="text"
              value={adminId}
              onChange={e => { setAdminId(e.target.value); setError('') }}
              placeholder="아이디 입력"
              autoComplete="username"
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none focus:border-rescue-orange transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">비밀번호</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="비밀번호 입력"
                autoComplete="current-password"
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-600 text-sm outline-none focus:border-rescue-orange transition-colors"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-400 font-bold bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-rescue-orange text-white font-black rounded-xl shadow-lg disabled:opacity-50 active:scale-95 transition-all text-sm">
            {loading ? '로그인 중...' : '관리자 로그인'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            ← 메인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}

const EMPTY_BANNER: BannerForm = {
  title: '', image_url: '', link_url: '', is_active: true, end_date: '', sort_order: 1,
}

export default function AdminPage() {
  const { user, profile, isLoading, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('approval')

  // 입점 승인
  const [pendingShops, setPendingShops] = useState<PendingSeller[]>([])
  const [approvalLoading, setApprovalLoading] = useState(false)

  // 광고 공통
  const [adsSubTab, setAdsSubTab] = useState<AdsSubTab>('banner')

  // 배너 광고
  const [bannerAds, setBannerAds] = useState<BannerAd[]>([])
  const [adsLoading, setAdsLoading] = useState(false)
  const [showBannerForm, setShowBannerForm] = useState(false)
  const [editingBanner, setEditingBanner] = useState<BannerAd | null>(null)
  const [bannerForm, setBannerForm] = useState<BannerForm>(EMPTY_BANNER)
  const [bannerSaving, setBannerSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 핀 광고
  const [pinAds, setPinAds] = useState<PinAd[]>([])
  const [pinAdsLoading, setPinAdsLoading] = useState(false)
  const [showPinForm, setShowPinForm] = useState(false)
  const [shopSearch, setShopSearch] = useState('')
  const [shopResults, setShopResults] = useState<ShopRow[]>([])
  const [shopSearchLoading, setShopSearchLoading] = useState(false)
  const [pinEndDate, setPinEndDate] = useState('')
  const [pinSaving, setPinSaving] = useState(false)

  // 검색광고
  const [searchAdShops, setSearchAdShops] = useState<ShopRow[]>([])
  const [searchAdLoading, setSearchAdLoading] = useState(false)
  const [searchAdQuery, setSearchAdQuery] = useState('')
  const [searchAdResults, setSearchAdResults] = useState<ShopRow[]>([])
  const [searchAdSearching, setSearchAdSearching] = useState(false)

  // 통계 대시보드
  const [stats, setStats] = useState<MarketingStats | null>(null)
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberResults, setMemberResults] = useState<MemberRow[]>([])
  const [memberSearching, setMemberSearching] = useState(false)

  // ── fetch 함수들 ─────────────────────────────────────────────────────────────

  const fetchPendingShops = async () => {
    setApprovalLoading(true)
    const { data } = await supabase
      .from('members')
      .select('id, nickname, phone, seller_status, created_at')
      .eq('role', 'seller')
      .eq('seller_status', 'pending')
      .order('created_at', { ascending: true })
    setPendingShops((data ?? []) as PendingSeller[])
    setApprovalLoading(false)
  }

  const fetchBannerAds = async () => {
    setAdsLoading(true)
    const { data } = await supabase.from('banners').select('*').order('sort_order', { ascending: true })
    if (data) setBannerAds(data as BannerAd[])
    setAdsLoading(false)
  }

  const fetchPinAds = async () => {
    setPinAdsLoading(true)
    const { data } = await supabase.from('pin_ads').select('*').order('created_at', { ascending: false })
    if (data) setPinAds(data as PinAd[])
    setPinAdsLoading(false)
  }

  const fetchSearchAdShops = async () => {
    setSearchAdLoading(true)
    const { data } = await supabase.from('shops').select('id, shop_name, category, is_search_ad, address')
      .eq('is_search_ad', true).order('shop_name')
    if (data) setSearchAdShops(data as ShopRow[])
    setSearchAdLoading(false)
  }

  const fetchDashboard = async () => {
    setStatsLoading(true)
    const [membersRes, sellersApprRes, sellersPendRes, shopsRes, productsRes, bannersRes, pinAdsRes, searchAdRes, mktRes] = await Promise.all([
      supabase.from('members').select('id', { count: 'exact', head: true }),
      supabase.from('members').select('id', { count: 'exact', head: true }).eq('role', 'seller').eq('seller_status', 'approved'),
      supabase.from('members').select('id', { count: 'exact', head: true }).eq('role', 'seller').eq('seller_status', 'pending'),
      supabase.from('shops').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('rescue_products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('banners').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('pin_ads').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('shops').select('id', { count: 'exact', head: true }).eq('is_search_ad', true),
      supabase.from('marketing_stats').select('*').single(),
    ])
    setDashboard({
      total_members: membersRes.count ?? 0,
      total_sellers_approved: sellersApprRes.count ?? 0,
      total_sellers_pending: sellersPendRes.count ?? 0,
      total_shops: shopsRes.count ?? 0,
      active_products: productsRes.count ?? 0,
      active_banners: bannersRes.count ?? 0,
      active_pin_ads: pinAdsRes.count ?? 0,
      search_ad_shops: searchAdRes.count ?? 0,
    })
    if (mktRes.data) setStats(mktRes.data as MarketingStats)
    setStatsLoading(false)
  }

  useEffect(() => { if (tab === 'approval' && user) fetchPendingShops() }, [tab, user])

  useEffect(() => {
    if (tab === 'ads' && user) {
      if (adsSubTab === 'banner') fetchBannerAds()
      if (adsSubTab === 'pin') fetchPinAds()
      if (adsSubTab === 'search') fetchSearchAdShops()
    }
  }, [tab, adsSubTab, user])

  useEffect(() => { if (tab === 'stats' && user) fetchDashboard() }, [tab, user])

  // ── 배너 광고 CRUD ───────────────────────────────────────────────────────────

  const openNewBanner = () => { setEditingBanner(null); setBannerForm(EMPTY_BANNER); setShowBannerForm(true) }
  const openEditBanner = (ad: BannerAd) => {
    setEditingBanner(ad)
    setBannerForm({ title: ad.title, image_url: ad.image_url, link_url: ad.link_url, is_active: ad.is_active, end_date: ad.end_date ?? '', sort_order: ad.sort_order })
    setShowBannerForm(true)
  }

  const uploadImage = async (file: File) => {
    setImageUploading(true)
    const ext = file.name.split('.').pop()
    const path = `banner_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('banners').upload(path, file, { upsert: true })
    if (error) { alert('이미지 업로드 실패: ' + error.message); setImageUploading(false); return }
    const url = `${SUPABASE_URL}/storage/v1/object/public/banners/${path}`
    setBannerForm(f => ({ ...f, image_url: url }))
    setImageUploading(false)
  }

  const saveBanner = async () => {
    if (!bannerForm.title.trim()) { alert('제목을 입력해주세요.'); return }
    if (!bannerForm.image_url) { alert('이미지를 업로드해주세요.'); return }
    setBannerSaving(true)
    const payload = {
      title: bannerForm.title.trim(), image_url: bannerForm.image_url,
      link_url: bannerForm.link_url.trim(), is_active: bannerForm.is_active, active: bannerForm.is_active,
      end_date: bannerForm.end_date || null, sort_order: bannerForm.sort_order,
    }
    if (editingBanner) {
      const { error } = await supabase.from('banners').update(payload).eq('id', editingBanner.id)
      if (error) { alert('저장 실패: ' + error.message); setBannerSaving(false); return }
    } else {
      const { error } = await supabase.from('banners').insert(payload)
      if (error) { alert('등록 실패: ' + error.message); setBannerSaving(false); return }
    }
    setBannerSaving(false); setShowBannerForm(false); fetchBannerAds()
  }

  const deleteBanner = async (id: string) => {
    if (!confirm('배너를 삭제하시겠습니까?')) return
    await supabase.from('banners').delete().eq('id', id)
    setBannerAds(prev => prev.filter(b => b.id !== id))
  }

  const toggleBannerActive = async (ad: BannerAd) => {
    const newVal = !ad.is_active
    await supabase.from('banners').update({ is_active: newVal, active: newVal }).eq('id', ad.id)
    setBannerAds(prev => prev.map(b => b.id === ad.id ? { ...b, is_active: newVal } : b))
  }

  // ── 핀 광고 ───────────────────────────────────────────────────────────────────

  const searchShops = async (q: string) => {
    if (!q.trim()) { setShopResults([]); return }
    setShopSearchLoading(true)
    const { data } = await supabase.from('shops').select('id, shop_name, category, is_search_ad, address')
      .ilike('shop_name', `%${q}%`).limit(10)
    setShopResults((data ?? []) as ShopRow[])
    setShopSearchLoading(false)
  }

  const savePinAd = async (shop: ShopRow) => {
    setPinSaving(true)
    const { error } = await supabase.from('pin_ads').insert({
      shop_id: shop.id,
      shop_name: shop.shop_name,
      end_date: pinEndDate || null,
      is_active: true,
    })
    if (error) { alert('등록 실패: ' + error.message) }
    else { setShowPinForm(false); setShopSearch(''); setShopResults([]); setPinEndDate(''); fetchPinAds() }
    setPinSaving(false)
  }

  const deletePinAd = async (id: string) => {
    if (!confirm('핀 광고를 삭제하시겠습니까?')) return
    await supabase.from('pin_ads').delete().eq('id', id)
    setPinAds(prev => prev.filter(p => p.id !== id))
  }

  const togglePinAd = async (ad: PinAd) => {
    const newVal = !ad.is_active
    await supabase.from('pin_ads').update({ is_active: newVal }).eq('id', ad.id)
    setPinAds(prev => prev.map(p => p.id === ad.id ? { ...p, is_active: newVal } : p))
  }

  // ── 검색광고 (shops.is_search_ad 토글) ───────────────────────────────────────

  const searchShopsForAd = async (q: string) => {
    if (!q.trim()) { setSearchAdResults([]); return }
    setSearchAdSearching(true)
    const { data } = await supabase.from('shops').select('id, shop_name, category, is_search_ad, address')
      .ilike('shop_name', `%${q}%`).limit(10)
    setSearchAdResults((data ?? []) as ShopRow[])
    setSearchAdSearching(false)
  }

  const toggleSearchAd = async (shop: ShopRow) => {
    const newVal = !shop.is_search_ad
    await supabase.from('shops').update({ is_search_ad: newVal }).eq('id', shop.id)
    setSearchAdShops(prev => newVal
      ? [...prev, { ...shop, is_search_ad: true }]
      : prev.filter(s => s.id !== shop.id)
    )
    setSearchAdResults(prev => prev.map(s => s.id === shop.id ? { ...s, is_search_ad: newVal } : s))
  }

  // ── 회원 검색 ────────────────────────────────────────────────────────────────

  const searchMembers = async (q: string) => {
    if (!q.trim()) { setMemberResults([]); return }
    setMemberSearching(true)
    const { data } = await supabase.from('members')
      .select('id, nickname, phone, role, seller_status, created_at')
      .or(`nickname.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(20)
    setMemberResults((data ?? []) as MemberRow[])
    setMemberSearching(false)
  }

  // ── 승인 처리 ────────────────────────────────────────────────────────────────

  const handleApprove = async (id: string) => {
    await supabase.from('members').update({ seller_status: 'approved' }).eq('id', id)
    setPendingShops(prev => prev.filter(s => s.id !== id))
  }

  const handleReject = async (id: string) => {
    await supabase.from('members').update({ seller_status: 'rejected' }).eq('id', id)
    setPendingShops(prev => prev.filter(s => s.id !== id))
  }

  // ── 로딩/권한 가드 ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="bg-dark-base flex items-center justify-center" style={{ height: '100dvh' }}>
        <img src="/logo.svg" alt="신선구조대" className="w-16 h-16 animate-bounce" />
      </div>
    )
  }

  if (!user || !profile || profile.role !== 'admin') return <AdminLoginForm />

  const TABS: { id: Tab; icon: React.ReactNode; label: string; count?: number }[] = [
    { id: 'approval', icon: <Store size={15} />, label: '입점 승인', count: pendingShops.length },
    { id: 'ads', icon: <Megaphone size={15} />, label: '광고 관리' },
    { id: 'stats', icon: <BarChart3 size={15} />, label: '대시보드' },
  ]

  const ADS_SUBTABS: { id: AdsSubTab; label: string }[] = [
    { id: 'banner', label: '배너광고' },
    { id: 'pin', label: '핀광고' },
    { id: 'search', label: '검색광고' },
  ]

  return (
    <div className="bg-gray-50 overflow-y-auto" style={{ height: '100dvh' }}>
      {/* 헤더 */}
      <header className="bg-dark-base text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 font-black text-lg">
          <img src="/logo.svg" alt="신선구조대" className="w-8 h-8 inline-block" />
          <span className="text-rescue-orange">신선구조대</span>
          <span className="text-xs text-gray-400 font-normal ml-1">HQ</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-purple-500 text-white px-2.5 py-1 rounded-full font-bold">관리자</span>
          <button onClick={signOut} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1">
            <LogOut size={13} /> 로그아웃
          </button>
        </div>
      </header>

      {/* 메인 탭 */}
      <div className="bg-white border-b flex">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-3 text-xs font-bold border-b-2 transition-colors ${tab === t.id ? 'border-rescue-orange text-rescue-orange' : 'border-transparent text-gray-400'}`}>
            <div className="flex items-center gap-1">
              {t.icon}
              {t.count !== undefined && t.count > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-black">{t.count}</span>
              )}
            </div>
            <span className="mt-0.5">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">

        {/* ── 탭 1: 입점 승인 ─────────────────────────────────── */}
        {tab === 'approval' && (
          <div>
            <p className="text-xs text-gray-400 mb-4">신규 구조 요청 가게 심사 · 승인 또는 반려 처리</p>
            {approvalLoading && <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-rescue-orange border-t-transparent rounded-full animate-spin" /></div>}
            {!approvalLoading && pendingShops.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <CheckCircle2 size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">처리할 입점 신청이 없습니다</p>
              </div>
            )}
            <div className="space-y-3">
              {pendingShops.map(seller => (
                <div key={seller.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-2xl">🏪</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-gray-900">{seller.nickname}</p>
                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">승인 대기</span>
                      </div>
                      {seller.phone && <p className="text-xs text-gray-500 mt-0.5">📞 {seller.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}</p>}
                      <p className="text-[10px] text-gray-300 mt-1">신청일: {new Date(seller.created_at).toLocaleDateString('ko-KR')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleApprove(seller.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-sm">
                      <CheckCircle2 size={15} /> 승인
                    </button>
                    <button onClick={() => handleReject(seller.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-200 text-gray-600 rounded-xl font-bold text-sm">
                      <XCircle size={15} /> 반려
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 탭 2: 광고 관리 ─────────────────────────────────── */}
        {tab === 'ads' && (
          <div>
            {/* 광고 서브탭 */}
            <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
              {ADS_SUBTABS.map(st => (
                <button key={st.id} onClick={() => setAdsSubTab(st.id)}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${adsSubTab === st.id ? 'bg-white text-rescue-orange shadow-sm' : 'text-gray-400'}`}>
                  {st.label}
                </button>
              ))}
            </div>

            {/* ── 배너광고 ── */}
            {adsSubTab === 'banner' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-gray-400">하단 배너 광고 슬롯 1·2 관리</p>
                  <button onClick={openNewBanner} className="flex items-center gap-1 bg-rescue-orange text-white text-xs font-black px-3 py-2 rounded-xl">
                    <Plus size={13} /> 새 배너 등록
                  </button>
                </div>

                {showBannerForm && (
                  <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 border-2 border-rescue-orange/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-black text-gray-900">{editingBanner ? '배너 수정' : '새 배너 등록'}</h3>
                      <button onClick={() => setShowBannerForm(false)}><X size={18} className="text-gray-400" /></button>
                    </div>
                    <div className="mb-3">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">배너 이미지 *</label>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }} />
                      {bannerForm.image_url ? (
                        <div className="relative">
                          <img src={bannerForm.image_url} alt="미리보기" className="w-full h-28 object-cover rounded-xl border border-gray-200" />
                          <button onClick={() => { setBannerForm(f => ({ ...f, image_url: '' })); if (fileInputRef.current) fileInputRef.current.value = '' }}
                            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow"><X size={12} /></button>
                        </div>
                      ) : (
                        <button onClick={() => fileInputRef.current?.click()} disabled={imageUploading}
                          className="w-full h-28 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-rescue-orange hover:text-rescue-orange transition-colors">
                          <Upload size={20} />
                          <span className="text-xs font-bold">{imageUploading ? '업로드 중...' : '이미지 선택'}</span>
                        </button>
                      )}
                    </div>
                    <div className="mb-3">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">배너 제목 *</label>
                      <input type="text" value={bannerForm.title} placeholder="예: 봄맞이 신선식품 특가"
                        onChange={e => setBannerForm(f => ({ ...f, title: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rescue-orange" />
                    </div>
                    <div className="mb-3">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">클릭 시 이동 URL</label>
                      <input type="url" value={bannerForm.link_url} placeholder="https://..."
                        onChange={e => setBannerForm(f => ({ ...f, link_url: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rescue-orange" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">배너 슬롯</label>
                        <select value={bannerForm.sort_order} onChange={e => setBannerForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rescue-orange">
                          <option value={1}>슬롯 1 (왼쪽)</option>
                          <option value={2}>슬롯 2 (오른쪽)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">게재 종료일</label>
                        <input type="date" value={bannerForm.end_date} onChange={e => setBannerForm(f => ({ ...f, end_date: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rescue-orange" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-xl px-3 py-2.5">
                      <span className="text-sm font-bold text-gray-700">즉시 노출</span>
                      <button onClick={() => setBannerForm(f => ({ ...f, is_active: !f.is_active }))}>
                        {bannerForm.is_active ? <ToggleRight size={28} className="text-rescue-orange" /> : <ToggleLeft size={28} className="text-gray-300" />}
                      </button>
                    </div>
                    <button onClick={saveBanner} disabled={bannerSaving}
                      className="w-full py-3 bg-rescue-orange text-white font-black rounded-xl disabled:opacity-50">
                      {bannerSaving ? '저장 중...' : editingBanner ? '배너 수정 저장' : '배너 등록 완료'}
                    </button>
                  </div>
                )}

                {adsLoading ? (
                  <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-rescue-orange border-t-transparent rounded-full animate-spin" /></div>
                ) : bannerAds.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <Megaphone size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">등록된 배너가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bannerAds.map(ad => (
                      <div key={ad.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        {ad.image_url && <img src={ad.image_url} alt={ad.title} className="w-full h-24 object-cover" />}
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black">슬롯 {ad.sort_order}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${ad.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {ad.is_active ? '● 노출 중' : '○ 비활성'}
                                </span>
                                {ad.end_date && <span className="text-[10px] text-gray-400">~ {ad.end_date}</span>}
                              </div>
                              <p className="font-black text-gray-900 mt-1 truncate">{ad.title}</p>
                              {ad.link_url && (
                                <a href={ad.link_url} target="_blank" rel="noopener noreferrer"
                                  className="text-[11px] text-blue-400 flex items-center gap-0.5 mt-0.5 truncate">
                                  <ExternalLink size={10} /> {ad.link_url}
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => toggleBannerActive(ad)} title={ad.is_active ? '비활성화' : '활성화'}>
                                {ad.is_active ? <ToggleRight size={22} className="text-rescue-orange" /> : <ToggleLeft size={22} className="text-gray-300" />}
                              </button>
                              <button onClick={() => openEditBanner(ad)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"><Edit3 size={15} /></button>
                              <button onClick={() => deleteBanner(ad.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── 핀광고 ── */}
            {adsSubTab === 'pin' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-gray-400">지도 핀 우선 노출 · 종료일 자동 만료</p>
                  <button onClick={() => setShowPinForm(v => !v)} className="flex items-center gap-1 bg-rescue-orange text-white text-xs font-black px-3 py-2 rounded-xl">
                    <Plus size={13} /> 핀광고 등록
                  </button>
                </div>

                {showPinForm && (
                  <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 border-2 border-rescue-orange/30">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-black text-gray-900">핀광고 등록</h3>
                      <button onClick={() => { setShowPinForm(false); setShopSearch(''); setShopResults([]) }}><X size={18} className="text-gray-400" /></button>
                    </div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">가게 검색</label>
                    <div className="relative mb-3">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" value={shopSearch} placeholder="가게명 입력"
                        onChange={e => { setShopSearch(e.target.value); searchShops(e.target.value) }}
                        className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm outline-none focus:border-rescue-orange" />
                    </div>
                    {shopSearchLoading && <p className="text-xs text-gray-400 mb-2">검색 중...</p>}
                    {shopResults.length > 0 && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
                        {shopResults.map(s => (
                          <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                            <div>
                              <p className="text-sm font-bold text-gray-900">{s.shop_name}</p>
                              <p className="text-xs text-gray-400">{s.category} · {s.address ?? ''}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">종료일</label>
                                <input type="date" value={pinEndDate} onChange={e => setPinEndDate(e.target.value)}
                                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-rescue-orange" />
                              </div>
                              <button onClick={() => savePinAd(s)} disabled={pinSaving}
                                className="bg-rescue-orange text-white text-xs font-black px-3 py-2 rounded-xl disabled:opacity-50">
                                {pinSaving ? '...' : '등록'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {pinAdsLoading ? (
                  <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-rescue-orange border-t-transparent rounded-full animate-spin" /></div>
                ) : pinAds.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <MapPin size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">등록된 핀 광고가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pinAds.map(ad => {
                      const isExpired = ad.end_date ? new Date(ad.end_date) < new Date() : false
                      return (
                        <div key={ad.id} className="bg-white rounded-2xl shadow-sm p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-rescue-orange/10 rounded-xl flex items-center justify-center text-xl">📍</div>
                              <div>
                                <p className="font-black text-gray-900">{ad.shop_name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${ad.is_active && !isExpired ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {isExpired ? '만료됨' : ad.is_active ? '● 노출 중' : '○ 비활성'}
                                  </span>
                                  {ad.end_date && <span className="text-[10px] text-gray-400">~ {ad.end_date}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => togglePinAd(ad)}>
                                {ad.is_active ? <ToggleRight size={22} className="text-rescue-orange" /> : <ToggleLeft size={22} className="text-gray-300" />}
                              </button>
                              <button onClick={() => deletePinAd(ad.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── 검색광고 ── */}
            {adsSubTab === 'search' && (
              <div>
                <p className="text-xs text-gray-400 mb-4">검색 결과 우선 노출 · 가게별 ON/OFF 설정</p>
                <div className="relative mb-4">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={searchAdQuery} placeholder="가게명 검색"
                    onChange={e => { setSearchAdQuery(e.target.value); searchShopsForAd(e.target.value) }}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm outline-none focus:border-rescue-orange bg-white" />
                </div>

                {searchAdSearching && <p className="text-xs text-gray-400 mb-2">검색 중...</p>}

                {searchAdResults.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
                    <p className="text-xs font-bold text-gray-400 px-4 pt-3 pb-1">검색 결과</p>
                    {searchAdResults.map(s => (
                      <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{s.shop_name}</p>
                          <p className="text-xs text-gray-400">{s.category}</p>
                        </div>
                        <button onClick={() => toggleSearchAd(s)}>
                          {s.is_search_ad ? <ToggleRight size={26} className="text-rescue-orange" /> : <ToggleLeft size={26} className="text-gray-300" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <h3 className="font-black text-gray-700 text-sm mb-3">현재 검색광고 등록 가게</h3>
                {searchAdLoading ? (
                  <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-rescue-orange border-t-transparent rounded-full animate-spin" /></div>
                ) : searchAdShops.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Search size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">검색광고 등록 가게가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchAdShops.map(s => (
                      <div key={s.id} className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{s.shop_name}</p>
                          <p className="text-xs text-gray-400">{s.category} · {s.address ?? ''}</p>
                        </div>
                        <button onClick={() => toggleSearchAd(s)}>
                          <ToggleRight size={26} className="text-rescue-orange" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 탭 3: 대시보드 ───────────────────────────────────── */}
        {tab === 'stats' && (
          <div>
            {statsLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-rescue-orange border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <>
                {/* 실시간 통계 그리드 */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { icon: <Users size={18} />, label: '총 회원', value: dashboard?.total_members ?? 0, color: 'text-blue-600 bg-blue-50' },
                    { icon: <Store size={18} />, label: '승인 사장님', value: dashboard?.total_sellers_approved ?? 0, color: 'text-emerald-600 bg-emerald-50' },
                    { icon: <Store size={18} />, label: '승인 대기', value: dashboard?.total_sellers_pending ?? 0, color: 'text-yellow-600 bg-yellow-50' },
                    { icon: <MapPin size={18} />, label: '운영 가게', value: dashboard?.total_shops ?? 0, color: 'text-purple-600 bg-purple-50' },
                    { icon: <Package size={18} />, label: '활성 상품', value: dashboard?.active_products ?? 0, color: 'text-rescue-orange bg-orange-50' },
                    { icon: <Megaphone size={18} />, label: '배너광고', value: dashboard?.active_banners ?? 0, color: 'text-pink-600 bg-pink-50' },
                    { icon: <MapPin size={18} />, label: '핀광고', value: dashboard?.active_pin_ads ?? 0, color: 'text-indigo-600 bg-indigo-50' },
                    { icon: <Search size={18} />, label: '검색광고', value: dashboard?.search_ad_shops ?? 0, color: 'text-teal-600 bg-teal-50' },
                  ].map(stat => (
                    <div key={stat.label} className={`rounded-2xl p-4 ${stat.color.split(' ')[1]}`}>
                      <div className={`${stat.color.split(' ')[0]} mb-2`}>{stat.icon}</div>
                      <div className="font-black text-2xl text-gray-900">{stat.value}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* 마케팅 동의율 */}
                {stats && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
                    <h3 className="font-black text-gray-700 text-sm mb-3 flex items-center gap-1.5">
                      <BarChart3 size={16} className="text-rescue-orange" /> 마케팅 동의 현황
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className="bg-rescue-orange h-3 rounded-full transition-all" style={{ width: `${stats.agree_rate_pct}%` }} />
                      </div>
                      <span className="font-black text-rescue-orange text-sm">{stats.agree_rate_pct}%</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{stats.marketing_agreed}명 / {stats.total_users}명 동의</p>
                  </div>
                )}

                {/* 회원 검색 */}
                <h3 className="font-black text-gray-700 text-sm mb-3">회원 검색</h3>
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={memberSearch} placeholder="닉네임 또는 전화번호 검색"
                    onChange={e => { setMemberSearch(e.target.value); searchMembers(e.target.value) }}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm outline-none focus:border-rescue-orange bg-white" />
                </div>
                {memberSearching && <p className="text-xs text-gray-400 mb-2">검색 중...</p>}
                {memberResults.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
                    {memberResults.map(m => (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                          {m.role === 'admin' ? '👑' : m.role === 'seller' ? '🏪' : '🛒'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{m.nickname ?? '이름없음'}</p>
                          <p className="text-xs text-gray-400">{m.phone ?? '-'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${m.role === 'seller' ? 'bg-emerald-100 text-emerald-700' : m.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {m.role === 'seller' ? '사장님' : m.role === 'admin' ? '관리자' : '고객'}
                          </span>
                          {m.seller_status && (
                            <p className={`text-[10px] mt-0.5 ${m.seller_status === 'approved' ? 'text-green-600' : m.seller_status === 'pending' ? 'text-yellow-600' : 'text-red-500'}`}>
                              {m.seller_status === 'approved' ? '승인' : m.seller_status === 'pending' ? '대기' : '반려'}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 개인정보 준수 안내 */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <h3 className="font-black text-amber-800 text-sm mb-2">📋 개인정보 보호법 준수 현황</h3>
                  <ul className="space-y-1.5 text-xs text-amber-700">
                    {[
                      '마케팅 동의 시 정확한 일시(marketing_agreed_at)를 DB에 기록',
                      '동의 취소 시 즉시 false로 갱신 (일시 보존)',
                      '법적 증빙을 위한 audit log 보존 (Supabase RLS)',
                      '제3자 제공 없음, 서비스 목적 이외 사용 금지',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-1.5">
                        <CheckCircle2 size={12} className="text-amber-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

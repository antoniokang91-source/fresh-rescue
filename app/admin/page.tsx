'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Users, Megaphone, Store, BarChart3, Eye, EyeOff, LogOut, Plus, Trash2, Edit3, Upload, X, ExternalLink, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
type Tab = 'approval' | 'ads' | 'stats'

const SUPABASE_URL = 'https://utcqwesokcvlvwahomjj.supabase.co'

interface MarketingStats {
  total_users: number
  marketing_agreed: number
  total_sellers: number
  agree_rate_pct: number
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

interface PendingSeller {
  id: string
  nickname: string
  phone: string | null
  seller_status: string
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
      // role 검증 — admin이 아니면 즉시 로그아웃
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
        {/* 로고 */}
        <div className="text-center mb-10">
          <img src="/logo.png" alt="신선구조대" className="w-20 h-20 mx-auto mb-3" />
          <h1 className="text-white font-black text-2xl tracking-tight">
            신선구조대 <span className="text-rescue-orange">HQ</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">관리자 전용 페이지</p>
        </div>

        {/* 로그인 카드 */}
        <form onSubmit={handleLogin} className="bg-white/5 border border-white/10 rounded-3xl p-7 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">관리자 아이디</label>
            <input
              type="text"
              value={adminId}
              onChange={e => { setAdminId(e.target.value); setError('') }}
              placeholder="아이디 입력"
              autoComplete="username"
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600
                text-sm outline-none focus:border-rescue-orange transition-colors"
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
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-600
                  text-sm outline-none focus:border-rescue-orange transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 font-bold bg-red-500/10 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-rescue-orange text-white font-black rounded-xl shadow-lg
              shadow-green-900/40 disabled:opacity-50 active:scale-95 transition-all text-sm"
          >
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

const EMPTY_FORM: BannerForm = {
  title: '', image_url: '', link_url: '', is_active: true, end_date: '', sort_order: 1,
}

export default function AdminPage() {
  const { user, profile, isLoading, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('approval')
  const [pendingShops, setPendingShops] = useState<PendingSeller[]>([])
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [bannerAds, setBannerAds] = useState<BannerAd[]>([])
  const [adsLoading, setAdsLoading] = useState(false)
  const [showBannerForm, setShowBannerForm] = useState(false)
  const [editingBanner, setEditingBanner] = useState<BannerAd | null>(null)
  const [bannerForm, setBannerForm] = useState<BannerForm>(EMPTY_FORM)
  const [bannerSaving, setBannerSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stats, setStats] = useState<MarketingStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // 승인 대기 사장님 목록 fetch (members 테이블 기반)
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

  useEffect(() => {
    if (tab === 'approval' && user) fetchPendingShops()
  }, [tab, user])

  const fetchBannerAds = async () => {
    setAdsLoading(true)
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) console.error('배너 로드 실패:', error)
    else if (data) setBannerAds(data as BannerAd[])
    setAdsLoading(false)
  }

  useEffect(() => {
    if (tab === 'ads' && user) fetchBannerAds()
  }, [tab, user])

  const openNewBanner = () => {
    setEditingBanner(null)
    setBannerForm(EMPTY_FORM)
    setShowBannerForm(true)
  }

  const openEditBanner = (ad: BannerAd) => {
    setEditingBanner(ad)
    setBannerForm({
      title: ad.title,
      image_url: ad.image_url,
      link_url: ad.link_url,
      is_active: ad.is_active,
      end_date: ad.end_date ?? '',
      sort_order: ad.sort_order,
    })
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
      title: bannerForm.title.trim(),
      image_url: bannerForm.image_url,
      link_url: bannerForm.link_url.trim(),
      is_active: bannerForm.is_active,
      active: bannerForm.is_active,
      end_date: bannerForm.end_date || null,
      sort_order: bannerForm.sort_order,
    }
    if (editingBanner) {
      const { error } = await supabase.from('banners').update(payload).eq('id', editingBanner.id)
      if (error) { alert('저장 실패: ' + error.message); setBannerSaving(false); return }
    } else {
      const { error } = await supabase.from('banners').insert(payload)
      if (error) { alert('등록 실패: ' + error.message); setBannerSaving(false); return }
    }
    setBannerSaving(false)
    setShowBannerForm(false)
    fetchBannerAds()
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

  // 마케팅 동의 통계 fetch
  useEffect(() => {
    if (tab !== 'stats' || !user) return
    setStatsLoading(true)
    supabase
      .from('marketing_stats')
      .select('*')
      .single()
      .then(({ data }) => {
        if (data) setStats(data as MarketingStats)
        setStatsLoading(false)
      })
  }, [tab, user])

  // 로딩 중
  if (isLoading) {
    return (
      <div className="bg-dark-base flex items-center justify-center" style={{ height: '100dvh' }}>
        <img src="/logo.png" alt="신선구조대" className="w-16 h-16 animate-bounce" />
      </div>
    )
  }

  // 미로그인 또는 admin이 아닌 경우 → 전용 로그인 폼
  if (!user || !profile || profile.role !== 'admin') {
    return <AdminLoginForm />
  }

  const handleApprove = async (rescuerId: string) => {
    await supabase
      .from('members')
      .update({ seller_status: 'approved' })
      .eq('id', rescuerId)
    setPendingShops((prev) => prev.filter((s) => s.id !== rescuerId))
  }

  const handleReject = async (rescuerId: string) => {
    await supabase
      .from('members')
      .update({ seller_status: 'rejected' })
      .eq('id', rescuerId)
    setPendingShops((prev) => prev.filter((s) => s.id !== rescuerId))
  }

  const TABS: { id: Tab; icon: React.ReactNode; label: string; count?: number }[] = [
    { id: 'approval', icon: <Store size={15} />, label: '입점 승인', count: pendingShops.length },
    { id: 'ads', icon: <Megaphone size={15} />, label: '광고 관리' },
    { id: 'stats', icon: <BarChart3 size={15} />, label: '유저 통계' },
  ]

  return (
    <div className="bg-gray-50 overflow-y-auto" style={{ height: '100dvh' }}>
      {/* 헤더 */}
      <header className="bg-dark-base text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 font-black text-lg">
          <img src="/logo.png" alt="신선구조대" className="w-8 h-8 inline-block" /> <span className="text-rescue-orange">신선구조대</span>
          <span className="text-xs text-gray-400 font-normal ml-1">HQ</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-purple-500 text-white px-2.5 py-1 rounded-full font-bold">
            관리자
          </span>
          <button
            onClick={signOut}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1"
          >
            <LogOut size={13} /> 로그아웃
          </button>
        </div>
      </header>

      {/* 탭 */}
      <div className="bg-white border-b flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-3 text-xs font-bold border-b-2 transition-colors ${
              tab === t.id
                ? 'border-rescue-orange text-rescue-orange'
                : 'border-transparent text-gray-400'
            }`}
          >
            <div className="flex items-center gap-1">
              {t.icon}
              {t.count !== undefined && t.count > 0 && (
                <span className="bg-siren-red text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                  {t.count}
                </span>
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
            <p className="text-xs text-gray-400 mb-4">
              신규 구조 요청 가게 심사 · 승인 또는 반려 처리
            </p>

            {approvalLoading && (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-rescue-orange border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!approvalLoading && pendingShops.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <CheckCircle2 size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">처리할 입점 신청이 없습니다</p>
              </div>
            )}

            <div className="space-y-3">
              {pendingShops.map((seller) => (
                <div key={seller.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-2xl">
                      🏪
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-gray-900">{seller.nickname}</p>
                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">
                          승인 대기
                        </span>
                      </div>
                      {seller.phone && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          📞 {seller.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-300 mt-1">
                        신청일: {new Date(seller.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleApprove(seller.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5
                        bg-safe-green text-white rounded-xl font-black text-sm"
                    >
                      <CheckCircle2 size={15} /> 승인
                    </button>
                    <button
                      onClick={() => handleReject(seller.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5
                        bg-gray-200 text-gray-600 rounded-xl font-bold text-sm"
                    >
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
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-400">하단 배너 광고 슬롯 1·2 관리</p>
              <button
                onClick={openNewBanner}
                className="flex items-center gap-1 bg-rescue-orange text-white text-xs font-black px-3 py-2 rounded-xl"
              >
                <Plus size={13} /> 새 배너 등록
              </button>
            </div>

            {/* 배너 등록/수정 폼 */}
            {showBannerForm && (
              <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 border-2 border-rescue-orange/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-gray-900">{editingBanner ? '배너 수정' : '새 배너 등록'}</h3>
                  <button onClick={() => setShowBannerForm(false)}><X size={18} className="text-gray-400" /></button>
                </div>

                {/* 이미지 업로드 */}
                <div className="mb-3">
                  <label className="text-xs font-bold text-gray-500 mb-1 block">배너 이미지 *</label>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }} />
                  {bannerForm.image_url ? (
                    <div className="relative">
                      <img src={bannerForm.image_url} alt="배너 미리보기"
                        className="w-full h-28 object-cover rounded-xl border border-gray-200" />
                      <button
                        onClick={() => { setBannerForm(f => ({ ...f, image_url: '' })); if (fileInputRef.current) fileInputRef.current.value = '' }}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow"
                      ><X size={12} /></button>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploading}
                      className="w-full h-28 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-rescue-orange hover:text-rescue-orange transition-colors"
                    >
                      <Upload size={20} />
                      <span className="text-xs font-bold">{imageUploading ? '업로드 중...' : '이미지 선택 (JPG/PNG/WEBP, 최대 5MB)'}</span>
                    </button>
                  )}
                </div>

                {/* 제목 */}
                <div className="mb-3">
                  <label className="text-xs font-bold text-gray-500 mb-1 block">배너 제목 *</label>
                  <input type="text" value={bannerForm.title} placeholder="예: 봄맞이 신선식품 특가"
                    onChange={e => setBannerForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rescue-orange" />
                </div>

                {/* 링크 URL */}
                <div className="mb-3">
                  <label className="text-xs font-bold text-gray-500 mb-1 block">클릭 시 이동 URL</label>
                  <input type="url" value={bannerForm.link_url} placeholder="https://..."
                    onChange={e => setBannerForm(f => ({ ...f, link_url: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rescue-orange" />
                </div>

                {/* 슬롯 + 종료일 */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">배너 슬롯</label>
                    <select value={bannerForm.sort_order}
                      onChange={e => setBannerForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rescue-orange">
                      <option value={1}>슬롯 1 (왼쪽)</option>
                      <option value={2}>슬롯 2 (오른쪽)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">게재 종료일</label>
                    <input type="date" value={bannerForm.end_date}
                      onChange={e => setBannerForm(f => ({ ...f, end_date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rescue-orange" />
                  </div>
                </div>

                {/* 노출 여부 */}
                <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-xl px-3 py-2.5">
                  <span className="text-sm font-bold text-gray-700">즉시 노출</span>
                  <button onClick={() => setBannerForm(f => ({ ...f, is_active: !f.is_active }))}>
                    {bannerForm.is_active
                      ? <ToggleRight size={28} className="text-rescue-orange" />
                      : <ToggleLeft size={28} className="text-gray-300" />}
                  </button>
                </div>

                <button onClick={saveBanner} disabled={bannerSaving}
                  className="w-full py-3 bg-rescue-orange text-white font-black rounded-xl disabled:opacity-50">
                  {bannerSaving ? '저장 중...' : editingBanner ? '배너 수정 저장' : '배너 등록 완료'}
                </button>
              </div>
            )}

            {/* 배너 목록 */}
            {adsLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-rescue-orange border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bannerAds.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Megaphone size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">등록된 배너가 없습니다</p>
                <p className="text-xs mt-1">위 "새 배너 등록" 버튼으로 추가하세요</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bannerAds.map((ad) => (
                  <div key={ad.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* 배너 이미지 미리보기 */}
                    {ad.image_url && (
                      <img src={ad.image_url} alt={ad.title}
                        className="w-full h-24 object-cover" />
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black">
                              슬롯 {ad.sort_order}
                            </span>
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
                        {/* 액션 버튼 */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => toggleBannerActive(ad)}
                            title={ad.is_active ? '비활성화' : '활성화'}>
                            {ad.is_active
                              ? <ToggleRight size={22} className="text-rescue-orange" />
                              : <ToggleLeft size={22} className="text-gray-300" />}
                          </button>
                          <button onClick={() => openEditBanner(ad)}
                            className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                            <Edit3 size={15} />
                          </button>
                          <button onClick={() => deleteBanner(ad.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 탭 3: 유저 통계 ─────────────────────────────────── */}
        {tab === 'stats' && (
          <div>
            <p className="text-xs text-gray-400 mb-4">
              마케팅 동의 유저 통계 · 개인정보 보호법 증빙용
            </p>

            {statsLoading && (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-rescue-orange border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!statsLoading && (
              <>
                {/* 통계 카드 */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    {
                      icon: <Users size={18} />,
                      label: '총 유저',
                      value: stats?.total_users ?? 0,
                      color: 'text-blue-600 bg-blue-50',
                    },
                    {
                      icon: <Megaphone size={18} />,
                      label: '마케팅 동의',
                      value: stats?.marketing_agreed ?? 0,
                      color: 'text-rescue-orange bg-green-50',
                    },
                    {
                      icon: <Store size={18} />,
                      label: '입점 사장님',
                      value: stats?.total_sellers ?? 0,
                      color: 'text-emerald-600 bg-emerald-50',
                    },
                    {
                      icon: <BarChart3 size={18} />,
                      label: '동의율',
                      value: `${stats?.agree_rate_pct ?? 0}%`,
                      color: 'text-purple-600 bg-purple-50',
                    },
                  ].map((stat) => (
                    <div key={stat.label} className={`rounded-2xl p-4 ${stat.color.split(' ')[1]}`}>
                      <div className={`${stat.color.split(' ')[0]} mb-2`}>{stat.icon}</div>
                      <div className="font-black text-2xl text-gray-900">{stat.value}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* 마케팅 동의 법적 안내 */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <h3 className="font-black text-amber-800 text-sm mb-2">
                    📋 개인정보 보호법 준수 현황
                  </h3>
                  <ul className="space-y-1.5 text-xs text-amber-700">
                    {[
                      '마케팅 동의 시 정확한 일시(marketing_agreed_at)를 DB에 기록',
                      '동의 취소 시 즉시 false로 갱신 (일시 보존)',
                      '법적 증빙을 위한 audit log 보존 (Supabase RLS)',
                      '제3자 제공 없음, 서비스 목적 이외 사용 금지',
                    ].map((item) => (
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

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Users, Megaphone, Store, BarChart3, Eye, EyeOff, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
type Tab = 'approval' | 'ads' | 'stats'

interface MarketingStats {
  total_users: number
  marketing_agreed: number
  total_sellers: number
  agree_rate_pct: number
}

interface BannerAd {
  id: string
  shop_name: string
  type: string
  is_active: boolean
  end_date: string
  title?: string
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
    <div className="min-h-screen bg-dark-base flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-10">
          <img src="/logo.svg" alt="신선구조대" className="w-20 h-20 mx-auto mb-3" />
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

export default function AdminPage() {
  const { user, profile, isLoading, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('approval')
  const [pendingShops, setPendingShops] = useState<PendingSeller[]>([])
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [bannerAds, setBannerAds] = useState<BannerAd[]>([])
  const [adsLoading, setAdsLoading] = useState(false)
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
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('배너 로드 실패:', error)
    } else if (data) {
      setBannerAds(data as BannerAd[])
    }
    setAdsLoading(false)
  }

  useEffect(() => {
    if (tab === 'ads' && user) fetchBannerAds()
  }, [tab, user])

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
      <div className="min-h-screen bg-dark-base flex items-center justify-center">
        <img src="/logo.svg" alt="신선구조대" className="w-16 h-16 animate-bounce" />
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
    { id: 'ads', icon: <Megaphone size={15} />, label: '광고 현황' },
    { id: 'stats', icon: <BarChart3 size={15} />, label: '유저 통계' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-dark-base text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 font-black text-lg">
          <img src="/logo.svg" alt="신선구조대" className="w-8 h-8 inline-block" /> <span className="text-rescue-orange">신선구조대</span>
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

        {/* ── 탭 2: 광고 현황 ─────────────────────────────────── */}
        {tab === 'ads' && (
          <div>
            <p className="text-xs text-gray-400 mb-4">전체 광고 현황 관제</p>
            {adsLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-rescue-orange border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bannerAds.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Megaphone size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">등록된 광고가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bannerAds.map((ad) => (
                  <div key={ad.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{ad.title ?? ad.shop_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                            {ad.type === 'top' ? '검색 상단' : '배너'}
                          </span>
                          <span className="text-xs text-gray-400">~ {ad.end_date}</span>
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${ad.is_active ? 'bg-safe-green' : 'bg-gray-300'}`} />
                    </div>
                    <div className={`mt-2 text-xs font-bold ${ad.is_active ? 'text-safe-green' : 'text-gray-400'}`}>
                      {ad.is_active ? '● 노출 중' : '● 만료됨'}
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

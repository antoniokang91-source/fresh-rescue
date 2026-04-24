'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronRight, CheckCircle2, Circle, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { UserRole } from '@/types'

type Tab = 'login' | 'join'
type JoinStep = 'form' | 'consent'

interface AuthModalProps {
  onClose: () => void
  initialRole?: UserRole
  initialTab?: Tab
  lockedRole?: UserRole  // 설정 시 역할 선택 UI 숨기고 해당 역할로 고정
}

const ROLE_OPTIONS: { value: UserRole; emoji: string; label: string; sub: string }[] = [
  { value: 'user', emoji: '🛒', label: '고객', sub: '구조대원으로 입장' },
  { value: 'seller', emoji: '🏪', label: '사장님', sub: '가게 등록 & 관리' },
]

export default function AuthModal({ onClose, initialRole = 'user', initialTab = 'login', lockedRole }: AuthModalProps) {
  const router = useRouter()
  const { refreshProfile } = useAuth()
  const [visible, setVisible] = useState(false)
  const [tab, setTab] = useState<Tab>(initialTab)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 전화번호·비밀번호는 탭 전환 시 공유
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  // lockedRole이 있으면 그걸로 고정, 없으면 자유 선택
  const effectiveInitial = lockedRole ?? initialRole
  const [loginRole, setLoginRole] = useState<UserRole>(effectiveInitial)
  const [joinRole, setJoinRole] = useState<UserRole>(effectiveInitial)

  // 회원가입 탭 전용
  const [joinStep, setJoinStep] = useState<JoinStep>('form')
  const [termsAgree, setTermsAgree] = useState(false)
  const [privacyAgree, setPrivacyAgree] = useState(false)
  const [marketingAgree, setMarketingAgree] = useState(false)
  const [postSignupState, setPostSignupState] = useState<'none' | 'user' | 'seller'>('none')

  const allRequired = termsAgree && privacyAgree
  const allChecked = allRequired && marketingAgree

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  // initialRole / lockedRole 변경 시 양쪽 탭 역할 동기화
  useEffect(() => {
    const role = lockedRole ?? initialRole
    setLoginRole(role)
    setJoinRole(role)
  }, [initialRole, lockedRole])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }

  const rawPhone = phone.replace(/-/g, '')

  const switchTab = (newTab: Tab) => {
    setTab(newTab)
    setError('')
    setJoinStep('form')
    setPassword('')
  }

  // ── 로그인 ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (rawPhone.length < 10) { setError('올바른 휴대폰 번호를 입력해주세요.'); return }
    if (password.length < 1) { setError('비밀번호를 입력해주세요.'); return }

    setLoading(true)
    setError('')
    try {
      const email = `${rawPhone}@fruitrescue.app`
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError('전화번호 또는 비밀번호가 올바르지 않습니다.')
        return
      }

      // DB에서 실제 role/승인 상태 조회
      const userId = signInData.user?.id
      let actualRole: string = loginRole
      let sellerStatus: string | null = null
      if (userId) {
        const { data: profileData } = await supabase
          .from('members')
          .select('role, seller_status, nickname')
          .eq('id', userId)
          .single()

        if (profileData) {
          actualRole = profileData.role ?? loginRole
          sellerStatus = profileData.seller_status ?? null
        } else {
          await supabase.from('members').insert({
            id: userId,
            phone: rawPhone,
            nickname: loginRole === 'seller' ? `사장님_${rawPhone.slice(-4)}` : `대원_${rawPhone.slice(-4)}`,
            role: loginRole,
            is_registered: true,
            rescue_count: 0,
          })
          actualRole = loginRole
        }
      }

      // seller_status='approved'만 로그인 허용, 나머지는 모두 차단
      if (actualRole === 'seller' && sellerStatus !== 'approved') {
        await supabase.auth.signOut()
        setError(
          sellerStatus === 'rejected'
            ? '가입 승인 요청이 거부되었습니다. 문의 후 다시 신청해주세요.'
            : '사장님 가입 승인이 필요합니다. 관리자의 승인이 완료되면 다시 로그인해주세요.'
        )
        return
      }

      await refreshProfile()
      handleClose()

      if (actualRole === 'admin') {
        router.push('/admin')
      } else if (actualRole === 'seller') {
        router.push('/seller/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── 회원가입 Step 1: 폼 → 동의 화면으로 ──────────────────────────────────
  const handleJoinNext = () => {
    if (rawPhone.length < 10) { setError('올바른 휴대폰 번호를 입력해주세요.'); return }
    if (password.length < 6) { setError('비밀번호는 6자리 이상 입력해주세요.'); return }
    setError('')
    setJoinStep('consent')
  }

  // ── 회원가입 Step 2: 가입 완료 ───────────────────────────────────────────
  const completeSignup = async () => {
    if (!allRequired) { setError('필수 항목에 동의해주세요.'); return }
    setLoading(true)
    setError('')
    try {
      const email = `${rawPhone}@fruitrescue.app`
      const now = new Date().toISOString()

      const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password })

      if (signUpError) {
        if (
          signUpError.message.includes('already registered') ||
          signUpError.message.includes('already been registered') ||
          signUpError.message.includes('User already registered')
        ) {
          setTab('login')
          setJoinStep('form')
          setPassword('')
          setError('이미 가입된 번호입니다. 비밀번호를 입력해 로그인해주세요.')
          return
        }
        throw signUpError
      }

      const userId = authData.user?.id
      if (!userId) throw new Error('계정 생성에 실패했습니다. 다시 시도해주세요.')

      if (joinRole === 'seller') {
        // 사장님: members에 role='seller', seller_status='pending'으로 등록
        const { error: rescuerError } = await supabase.from('members').upsert({
          id: userId,
          phone: rawPhone,
          nickname: `사장님_${rawPhone.slice(-4)}`,
          role: 'seller',
          seller_status: 'pending',
          is_registered: true,
          marketing_agree: marketingAgree,
          marketing_agreed_at: marketingAgree ? now : null,
        })
        if (rescuerError) throw rescuerError

        await supabase.auth.signOut()
        setPostSignupState('seller')
        setPhone('')
        setPassword('')
        setJoinStep('form')
      } else {
        // 고객: members 테이블에 저장
        const { error: rescuerError } = await supabase.from('members').upsert({
          id: userId,
          phone: rawPhone,
          nickname: `대원_${rawPhone.slice(-4)}`,
          role: 'user',
          is_registered: true,
          marketing_agree: marketingAgree,
          marketing_agreed_at: marketingAgree ? now : null,
        })
        if (rescuerError) throw rescuerError

        // 고객은 바로 로그인
        setPostSignupState('user')
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          console.error('Auto sign in failed:', signInError)
          // 실패해도 진행
        } else {
          await refreshProfile()
        }
      }
    } catch (e: any) {
      setError(e.message || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const toggleAll = () => {
    const next = !allChecked
    setTermsAgree(next)
    setPrivacyAgree(next)
    setMarketingAgree(next)
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black transition-opacity duration-300 ${visible ? 'opacity-50' : 'opacity-0'}`}
        onClick={handleClose}
      />

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* ── 환영 / 승인 대기 화면 ─────────────────────────────────────────── */}
        {postSignupState !== 'none' ? (
          <div className="px-6 pb-10 pt-2 flex flex-col items-center text-center gap-4">
            <div className="relative mt-2">
              <img src="/logo.svg" alt="신선구조대" className="w-24 h-24 animate-bounce" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-siren-red rounded-full animate-ping" />
            </div>
            <div>
              <h2 className="font-black text-2xl text-gray-900 leading-tight">
                {postSignupState === 'user' ? '신선 구조대원이 되신 것을 환영합니다!' : '사장님 가입이 접수되었습니다'}
              </h2>
              <p className="text-gray-500 text-sm mt-3 leading-relaxed">
                {postSignupState === 'user'
                  ? '위기에 처한 제품들을 구조해주세요. 고객님께서 찾는 만큼 지역 상권이 살아납니다.'
                  : '긴급 구조 요청을 위해 본사 승인이 필요합니다. 관리자가 승인하면 dashboard 접근 권한이 부여됩니다.'}
              </p>
            </div>
            <div className={`w-full rounded-2xl px-5 py-4 mt-1 ${postSignupState === 'user' ? 'bg-green-50' : 'bg-emerald-50'}`}>
              <p className={`text-xs font-bold ${postSignupState === 'user' ? 'text-rescue-orange' : 'text-emerald-700'}`}>
                {postSignupState === 'user' ? '🎖️ 구조대원 임무' : '🔒 승인 대기 중'}
              </p>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                {postSignupState === 'user'
                  ? '지도에서 마감 임박 상품을 찾아 직접 방문 후 구매하면 구조 완료!'
                  : '관리자 승인 후 사장님 대시보드에서 상품 등록, 홍보, 사진 업로드가 가능합니다.'}
              </p>
            </div>
            <button
              onClick={async () => {
                if (postSignupState === 'user') {
                  // 고객은 프로필 재로드 후 모달 닫기
                  await refreshProfile()
                }
                handleClose()
              }}
              className={`w-full py-4 text-white font-black text-base rounded-2xl shadow-lg active:scale-95 transition-all mt-1 ${
                postSignupState === 'user' ? 'bg-rescue-orange shadow-green-200' : 'bg-emerald-600 shadow-emerald-200'
              }`}
            >
              {postSignupState === 'user' ? '🚨 지금 바로 출동하기!' : '확인했어요'}
            </button>
          </div>
        ) : (
          <>
        <button className="absolute top-4 right-4 text-gray-300 hover:text-gray-500" onClick={handleClose}>
          <X size={22} />
        </button>

        {/* ── 헤더 + 탭 ────────────────────────────────────────────────── */}
        <div className="px-6 pt-1 pb-0">
          <div className="flex items-center gap-3 mb-4">
            {lockedRole === 'seller' ? <span className="text-3xl">🏪</span> : <img src="/logo.svg" alt="신선구조대" className="w-10 h-10" />}
            <div>
              <h2 className="font-black text-xl text-gray-900">
                {lockedRole === 'seller' ? '사장님 전용' : '신선구조대'}
              </h2>
              <p className="text-xs text-gray-400">
                {lockedRole === 'seller' ? '가게 등록 & 관리' : '구조대원 입장'}
              </p>
            </div>
          </div>

          {/* 탭 전환 — 동의 화면에서는 숨김 */}
          {joinStep !== 'consent' && (
            <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
              <button
                onClick={() => switchTab('login')}
                className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all ${tab === 'login' ? 'bg-white text-rescue-orange shadow-sm' : 'text-gray-400'}`}
              >
                로그인
              </button>
              <button
                onClick={() => switchTab('join')}
                className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all ${tab === 'join' ? 'bg-white text-rescue-orange shadow-sm' : 'text-gray-400'}`}
              >
                회원가입
              </button>
            </div>
          )}
        </div>

        {/* ── 로그인 탭 ────────────────────────────────────────────────── */}
        {tab === 'login' && (
          <div className="px-6 pb-8">
            {/* 역할 선택 — lockedRole 없을 때만 표시 */}
            {!lockedRole && (
              <div className="grid grid-cols-2 gap-2 mb-5">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setLoginRole(r.value)}
                    className={`flex flex-col items-center py-3 rounded-2xl border-2 transition-all ${
                      loginRole === r.value
                        ? 'border-rescue-orange bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl mb-1">{r.emoji}</span>
                    <span className={`text-sm font-black ${loginRole === r.value ? 'text-rescue-orange' : 'text-gray-600'}`}>
                      {r.label}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">{r.sub}</span>
                  </button>
                ))}
              </div>
            )}

            <label className="block text-xs font-bold text-gray-500 mb-2">📱 휴대폰 번호</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="010-0000-0000"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base font-bold outline-none focus:border-rescue-orange transition-colors mb-3"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />

            <label className="block text-xs font-bold text-gray-500 mb-2">🔒 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base font-bold outline-none focus:border-rescue-orange transition-colors mb-5"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />

            {error && <p className="text-xs text-siren-red mb-3">{error}</p>}

            <button
              onClick={handleLogin}
              disabled={loading}
              className={`w-full py-4 text-white font-black text-base rounded-2xl shadow-lg active:scale-95 transition-all mb-3 ${
                loginRole === 'seller'
                  ? 'bg-emerald-500 shadow-emerald-100'
                  : 'bg-rescue-orange shadow-green-100'
              }`}
            >
              {loading
                ? '로그인 중...'
                : loginRole === 'seller'
                ? '🏪 사장님 로그인'
                : '🛒 고객 로그인'}
            </button>

            {/* 역할별 안내 */}
            {loginRole === 'seller' ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 mb-4">
                <p className="text-xs text-emerald-700 leading-relaxed">
                  🏪 <strong>사장님 로그인 후</strong> 내 가게 관리 페이지로 자동 이동합니다.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 mb-4">
                <p className="text-xs text-blue-700 leading-relaxed">
                  💡 <strong>회원가입 하면</strong> AI가 내 주변 500m 이내 <strong>&apos;긴급 구조&apos;</strong> 상품을 실시간 분석해 알람을 드려요!
                </p>
              </div>
            )}

            <button onClick={handleClose} className="w-full py-3 text-sm text-gray-400 border border-gray-200 rounded-2xl">
              둘러보기 모드로 계속
            </button>
          </div>
        )}

        {/* ── 회원가입 탭 — 폼 ─────────────────────────────────────────── */}
        {tab === 'join' && joinStep === 'form' && (
          <div className="px-6 pb-8">
            {/* 역할 선택 — lockedRole 없을 때만 표시 */}
            {!lockedRole && (
              <div className="grid grid-cols-2 gap-2 mb-5">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setJoinRole(r.value)}
                    className={`flex flex-col items-center py-3 rounded-2xl border-2 transition-all ${
                      joinRole === r.value
                        ? 'border-rescue-orange bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl mb-1">{r.emoji}</span>
                    <span className={`text-sm font-black ${joinRole === r.value ? 'text-rescue-orange' : 'text-gray-600'}`}>
                      {r.label}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">{r.sub}</span>
                  </button>
                ))}
              </div>
            )}

            <label className="block text-xs font-bold text-gray-500 mb-2">📱 휴대폰 번호</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="010-0000-0000"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base font-bold outline-none focus:border-rescue-orange transition-colors mb-3"
            />

            <label className="block text-xs font-bold text-gray-500 mb-2">🔒 비밀번호 설정</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자리 이상 입력"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base font-bold outline-none focus:border-rescue-orange transition-colors mb-5"
              onKeyDown={(e) => e.key === 'Enter' && handleJoinNext()}
            />

            {error && <p className="text-xs text-siren-red mb-3">{error}</p>}

            <button
              onClick={handleJoinNext}
              className="w-full py-4 bg-rescue-orange text-white font-black text-base rounded-2xl shadow-lg active:scale-95 transition-all mb-3"
            >
              다음 — 약관 동의
            </button>

            <button onClick={handleClose} className="w-full py-3 text-sm text-gray-400 border border-gray-200 rounded-2xl">
              둘러보기 모드로 계속
            </button>
          </div>
        )}

        {/* ── 회원가입 탭 — 동의 화면 ──────────────────────────────────── */}
        {tab === 'join' && joinStep === 'consent' && (
          <div className="px-6 pb-8">
            <button
              className="flex items-center gap-1 text-gray-400 text-sm mb-4"
              onClick={() => { setJoinStep('form'); setError('') }}
            >
              <ArrowLeft size={16} /> 돌아가기
            </button>

            <h2 className="font-black text-xl text-gray-900 mb-1">서비스 이용 동의</h2>
            <p className="text-sm text-gray-400 mb-5">안전한 구조 활동을 위해 약관을 확인해주세요</p>

            <button
              onClick={toggleAll}
              className={`w-full flex items-center gap-3 py-3.5 px-4 rounded-2xl border-2 mb-3 transition-all ${allChecked ? 'border-rescue-orange bg-green-50' : 'border-gray-200 bg-gray-50'}`}
            >
              {allChecked ? <CheckCircle2 size={22} className="text-rescue-orange" /> : <Circle size={22} className="text-gray-300" />}
              <span className="font-black text-gray-800">전체 동의하기</span>
            </button>

            <div className="space-y-2.5 mb-5">
              <ConsentItem checked={termsAgree} onChange={setTermsAgree} required label="서비스 이용약관" />
              <ConsentItem checked={privacyAgree} onChange={setPrivacyAgree} required label="개인정보 처리방침" />
              <ConsentItem checked={marketingAgree} onChange={setMarketingAgree} required={false} label="AI 실시간 추천 알림 동의" />
            </div>

            {error && <p className="text-xs text-siren-red mb-3 text-center">{error}</p>}

            <button
              onClick={completeSignup}
              disabled={loading || !allRequired}
              className="w-full py-4 bg-rescue-orange text-white font-black text-base rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? '처리 중...' : '동의하고 구조대 합류하기'}
            </button>
          </div>
        )}
        </>
        )}
      </div>
    </>
  )
}

function ConsentItem({ checked, onChange, required, label }: any) {
  return (
    <div className="flex items-center gap-2.5">
      <button onClick={() => onChange(!checked)}>
        {checked ? <CheckCircle2 size={20} className="text-rescue-orange" /> : <Circle size={20} className="text-gray-300" />}
      </button>
      <span className="flex-1 text-sm text-gray-700">
        <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md mr-1.5 ${required ? 'bg-siren-red text-white' : 'bg-gray-200 text-gray-500'}`}>
          {required ? '필수' : '선택'}
        </span>
        {label}
      </span>
      <ChevronRight size={16} className="text-gray-300" />
    </div>
  )
}

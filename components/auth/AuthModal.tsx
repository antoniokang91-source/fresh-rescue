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
}

const ROLE_OPTIONS: { value: UserRole; emoji: string; label: string; sub: string }[] = [
  { value: 'user', emoji: '🛒', label: '고객', sub: '구조대원으로 입장' },
  { value: 'seller', emoji: '🏪', label: '사장님', sub: '가게 등록 & 관리' },
]

const TERMS_CONTENT: Record<string, { label: string; content: string }> = {
  terms: {
    label: '서비스 이용약관',
    content: `신선구조대 서비스 이용약관

1. 총칙
본 약관은 신선구조대가 제공하는 서비스 이용에 관한 기본적인 사항을 규정합니다.

2. 서비스 설명
신선구조대는 유통기한이 임박한 상품을 실시간으로 매칭하여 판매자와 구매자를 연결하는 플랫폼입니다.

3. 이용자의 의무
- 실명으로 가입해야 합니다.
- 거짓 정보를 제공해서는 안 됩니다.
- 타인의 계정을 무단으로 사용할 수 없습니다.

4. 서비스 이용 제한
다음과 같은 경우 서비스 이용을 제한할 수 있습니다:
- 법령 위반 행위
- 타인의 권리 침해
- 플랫폼 운영 방해 행위

5. 면책 조항
신선구조대는 사용자 간의 거래로 인한 분쟁에 대해 책임을 지지 않습니다.

6. 기타
본 약관은 사전 공지 없이 변경될 수 있습니다.`,
  },
  privacy: {
    label: '개인정보 처리방침',
    content: `신선구조대 개인정보 처리방침

1. 수집하는 개인정보
- 전화번호
- 가게 정보 (판매자)
- 위치 정보 (선택)

2. 이용 목적
- 서비스 제공 및 거래 진행
- 고객 지원
- 마케팅 및 분석

3. 보관 기간
개인정보는 회원 탈퇴 시까지 보관합니다.

4. 제3자 제공
명시적 동의 없이 제3자에게 제공되지 않습니다.

5. 보안
개인정보 보호를 위해 암호화 등 기술적 조치를 취합니다.

6. 이용자 권리
이용자는 언제든지 개인정보 열람, 정정, 삭제를 요청할 수 있습니다.`,
  },
  marketing: {
    label: 'AI 실시간 추천 알림 동의',
    content: `AI 실시간 추천 알림 동의서

1. 목적
AI 기반 개인화 추천 서비스를 제공하기 위해 활용됩니다.

2. 수집 정보
- 열람 상품 정보
- 거래 이력
- 위치 정보

3. 비동의 시 처우
비동의해도 기본 서비스 이용에는 제약이 없습니다.

4. 언제든지 철회 가능
설정에서 알림 동의를 철회할 수 있습니다.`,
  },
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const router = useRouter()
  const { refreshProfile } = useAuth()
  const [visible, setVisible] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)  // 역할 선택 화면 제어
  const [tab, setTab] = useState<Tab>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 전화번호·비밀번호는 탭 전환 시 공유
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')

  // selectedRole이 정해지면 그걸로 고정
  const [loginRole, setLoginRole] = useState<UserRole>(selectedRole ?? 'user')
  const [joinRole, setJoinRole] = useState<UserRole>(selectedRole ?? 'user')

  // 회원가입 탭 전용
  const [joinStep, setJoinStep] = useState<JoinStep>('form')
  const [termsAgree, setTermsAgree] = useState(false)
  const [privacyAgree, setPrivacyAgree] = useState(false)
  const [marketingAgree, setMarketingAgree] = useState(false)
  const [postSignupState, setPostSignupState] = useState<'none' | 'user' | 'seller'>('none')
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null)

  const allRequired = termsAgree && privacyAgree
  const allChecked = allRequired && marketingAgree

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  // selectedRole 변경 시 양쪽 탭 역할 동기화
  useEffect(() => {
    const role = selectedRole ?? 'user'
    setLoginRole(role)
    setJoinRole(role)
  }, [selectedRole])

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
    setNickname('')
  }

  // ── 로그인 ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (rawPhone.length < 10) { setError('올바른 휴대폰 번호를 입력해주세요.'); return }
    if (password.length < 1) { setError('비밀번호를 입력해주세요.'); return }

    setLoading(true)
    setError('')
    try {
      const email = `user+${rawPhone}@fruitrescue.app`
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
    if (nickname.trim().length < 2) { setError('닉네임은 2자리 이상 입력해주세요.'); return }
    setError('')
    setJoinStep('consent')
  }

  // ── 회원가입 Step 2: 가입 완료 ───────────────────────────────────────────
  const completeSignup = async () => {
    if (!allRequired) { setError('필수 항목에 동의해주세요.'); return }
    setLoading(true)
    setError('')
    try {
      const email = `user+${rawPhone}@fruitrescue.app`
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
          setLoading(false)
          return
        }
        throw signUpError
      }

      const userId = authData.user?.id
      if (!userId) throw new Error('계정 생성에 실패했습니다. 다시 시도해주세요.')

      if (joinRole === 'seller') {
        // 사장님: members에 role='seller', seller_status='pending'으로 등록
        const { error: rescuerError } = await supabase.from('members').insert({
          id: userId,
          phone: rawPhone,
          nickname: `사장님_${rawPhone.slice(-4)}`,
          role: 'seller',
          seller_status: 'pending',
          is_registered: true,
          marketing_agree: marketingAgree,
          marketing_agreed_at: marketingAgree ? now : null,
        })
        if (rescuerError) {
          console.error('Members insert error:', rescuerError)
          throw new Error(`멤버 등록 실패: ${rescuerError.message}`)
        }

        await supabase.auth.signOut()
        setPostSignupState('seller')
        setPhone('')
        setPassword('')
        setNickname('')
        setJoinStep('form')
        setLoading(false)
      } else {
        // 고객: members 테이블에 저장
        const { error: rescuerError } = await supabase.from('members').insert({
          id: userId,
          phone: rawPhone,
          nickname: nickname,
          role: 'user',
          is_registered: true,
          marketing_agree: marketingAgree,
          marketing_agreed_at: marketingAgree ? now : null,
        })
        if (rescuerError) {
          console.error('Members insert error:', rescuerError)
          throw new Error(`멤버 등록 실패: ${rescuerError.message}`)
        }

        // 고객은 바로 로그인
        setPostSignupState('user')
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          console.error('Auto sign in failed:', signInError)
          setError('자동 로그인에 실패했습니다. 로그인을 다시 시도해주세요.')
          setLoading(false)
          return
        }
        await refreshProfile()
        setLoading(false)
      }
    } catch (e: any) {
      console.error('Signup error:', e)
      setError(e.message || '회문가입에 실패했습니다.')
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

        {/* ── 역할 선택 (첫 화면) ──────────────────────────────────────────────── */}
        {!selectedRole ? (
          <div className="px-6 pb-10 pt-6 flex flex-col items-center text-center gap-4">
            <h2 className="font-black text-2xl text-gray-900">어떻게 이용할까요?</h2>
            <p className="text-gray-500 text-sm">신선구조대에 오신 것을 환영합니다!</p>
            <div className="w-full space-y-3 mt-4">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-2xl hover:border-blue-600 hover:bg-blue-50 transition-colors text-left active:scale-95"
                >
                  <div className="text-2xl mb-1">{role.emoji}</div>
                  <div className="font-bold text-gray-900">{role.label}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{role.sub}</div>
                </button>
              ))}
            </div>
          </div>
        ) : postSignupState !== 'none' ? (
          <div className="px-6 pb-10 pt-2 flex flex-col items-center text-center gap-4">
            <div className="relative mt-2">
              <img src="/logo.png" alt="신선구조대" className="w-24 h-24 animate-bounce" />
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
            {selectedRole === 'seller' ? <span className="text-3xl">🏪</span> : <img src="/logo.png" alt="신선구조대" className="w-10 h-10" />}
            <div>
              <h2 className="font-black text-xl text-gray-900">
                {selectedRole === 'seller' ? '사장님 전용' : '신선구조대'}
              </h2>
              <p className="text-xs text-gray-400">
                {selectedRole === 'seller' ? '가게 등록 & 관리' : '구조대원 입장'}
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
            {/* 역할 선택 — selectedRole 없을 때만 표시 */}
            {!selectedRole && (
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
            {/* 역할 선택 — selectedRole 없을 때만 표시 */}
            {!selectedRole && (
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
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base font-bold outline-none focus:border-rescue-orange transition-colors mb-3"
              onKeyDown={(e) => e.key === 'Enter' && handleJoinNext()}
            />

            <label className="block text-xs font-bold text-gray-500 mb-2">👤 사용하실 닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="2자리 이상 입력"
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
              <ConsentItem checked={termsAgree} onChange={setTermsAgree} required termKey="terms" label="서비스 이용약관" expandedTerm={expandedTerm} onExpandTerm={setExpandedTerm} />
              <ConsentItem checked={privacyAgree} onChange={setPrivacyAgree} required termKey="privacy" label="개인정보 처리방침" expandedTerm={expandedTerm} onExpandTerm={setExpandedTerm} />
              <ConsentItem checked={marketingAgree} onChange={setMarketingAgree} required={false} termKey="marketing" label="AI 실시간 추천 알림 동의" expandedTerm={expandedTerm} onExpandTerm={setExpandedTerm} />
            </div>

            {/* ── 약관 내용 표시 ────────────────────────────────────── */}
            {expandedTerm && TERMS_CONTENT[expandedTerm] && (
              <div className="bg-gray-50 rounded-xl p-4 mb-5 max-h-96 overflow-y-auto border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{TERMS_CONTENT[expandedTerm].label}</h3>
                  <button onClick={() => setExpandedTerm(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-light">{TERMS_CONTENT[expandedTerm].content}</p>
              </div>
            )}

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

function ConsentItem({ checked, onChange, required, label, termKey, expandedTerm, onExpandTerm }: any) {
  return (
    <div className="flex items-center gap-2.5">
      <button onClick={() => onChange(!checked)}>
        {checked ? <CheckCircle2 size={20} className="text-blue-600" /> : <Circle size={20} className="text-gray-300" />}
      </button>
      <button
        onClick={() => onExpandTerm(expandedTerm === termKey ? null : termKey)}
        className="flex-1 flex items-center gap-2.5 text-left hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
      >
        <span className="flex-1 text-sm text-gray-700">
          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md mr-1.5 ${required ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}>
            {required ? '필수' : '선택'}
          </span>
          {label}
        </span>
        <ChevronRight size={16} className={`text-gray-400 transition-transform ${expandedTerm === termKey ? 'rotate-90' : ''}`} />
      </button>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { MapPin, Store, LogIn, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import AuthModal from '@/components/auth/AuthModal'
import type { UserRole } from '@/types'

export default function Header() {
  const { user, profile, isLoading, signOut } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [lockedRole, setLockedRole] = useState<UserRole>('user')

  const openAuth = (role: UserRole) => {
    setLockedRole(role)
    setShowAuth(true)
  }

  // 로그인 유저 이름 — 닉네임 > 전화번호 뒷자리
  const displayName = profile?.nickname
    ?? (profile?.phone ? '••' + profile.phone.slice(-4) : null)

  // 역할 배지
  const roleBadge =
    profile?.role === 'admin'
      ? { label: '관리자', color: 'bg-purple-500' }
      : profile?.role === 'seller'
      ? { label: '사장님', color: 'bg-emerald-500' }
      : null

  return (
    <>
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between z-30 relative shrink-0">
        {/* 로고 */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚑</span>
          <div>
            <div className="font-black text-rescue-orange text-lg leading-none tracking-tight">
              마감구조대
            </div>
          
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1.5">
          {/* 사장님인가요? → seller 전용 모달 */}
          {!user && (
            <button
              onClick={() => openAuth('seller')}
              className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50
                border border-emerald-200 px-2.5 py-1.5 rounded-full font-bold"
            >
              <Store size={11} />
              <span className="hidden sm:inline">사장님인가요?</span>
              <span className="sm:hidden">입점</span>
            </button>
          )}

          {/* 대시보드 (사장님/관리자) */}
          {user && profile && profile.role !== 'user' && (
            <a
              href={profile.role === 'admin' ? '/admin' : '/seller/dashboard'}
              className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50
                border border-purple-200 px-2.5 py-1.5 rounded-full font-bold"
            >
              <LayoutDashboard size={11} />
              {profile.role === 'admin' ? '관리자' : '내 가게'}
            </a>
          )}

          {/* 내 위치 */}
          <button
            className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded-full"
            onClick={() => navigator.geolocation?.getCurrentPosition(() => {})}
          >
            <MapPin size={11} />
            <span className="hidden sm:inline">내 위치</span>
          </button>

          {/* 로그인 / 유저 정보 */}
          {/* 로그인 → 고객 전용 모달 */}
          {isLoading ? null : user ? (
            <div className="flex items-center gap-1.5">
              {/* 유저 아바타 */}
              <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-2.5 py-1.5 rounded-full">
                {roleBadge && (
                  <span className={`text-[9px] text-white px-1.5 py-0.5 rounded-full font-black ${roleBadge.color}`}>
                    {roleBadge.label}
                  </span>
                )}
                <span className="text-xs font-bold text-gray-700">{displayName}</span>
              </div>
              {/* 로그아웃 */}
              <button
                onClick={signOut}
                className="text-gray-400 hover:text-gray-600 p-1.5"
                title="로그아웃"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuth('user')}
              className="flex items-center gap-1 text-xs text-white bg-rescue-orange
                px-3 py-1.5 rounded-full font-black shadow-md shadow-orange-200"
            >
              <LogIn size={11} />
              로그인
            </button>
          )}

        </div>
      </header>

      {/* ── 인증 모달 ───────────────────────────────────────────── */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          lockedRole={lockedRole}
        />
      )}
    </>
  )
}

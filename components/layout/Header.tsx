'use client'

import { useState } from 'react'
import { Store, LogIn, LogOut, LayoutDashboard } from 'lucide-react'
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

  const displayName = profile?.nickname
    ?? (profile?.phone ? '••' + profile.phone.slice(-4) : null)

  const roleBadge =
    profile?.role === 'admin'
      ? { label: '관리자', color: 'bg-purple-500' }
      : profile?.role === 'seller'
      ? { label: '사장님', color: 'bg-[#E8521A]' }
      : null

  return (
    <>
      <header className="bg-white border-b border-gray-100 shadow-sm px-4 py-2.5 flex items-center justify-between z-30 relative shrink-0">
        {/* 로고 */}
        <div className="flex items-center gap-2 overflow-hidden" style={{ height: 44 }}>
          <img src="/logo.png" alt="신선구조대" className="w-auto object-contain"
            style={{ height: '200%', marginTop: '-50%' }} />
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1.5">
          {/* 사장님인가요? */}
          {!user && (
            <button
              onClick={() => openAuth('seller')}
              className="flex items-center gap-1 text-xs text-[#E8521A] bg-orange-50
                border border-orange-200 px-2.5 py-1.5 rounded-full font-bold"
            >
              <Store size={11} />
              <span className="hidden sm:inline">사장님인가요?</span>
              <span className="sm:hidden">입점</span>
            </button>
          )}

          {/* 대시보드 */}
          {user && profile && profile.role !== 'user' && (
            <a
              href={profile.role === 'admin' ? '/admin' : '/seller/dashboard'}
              className="flex items-center gap-1 text-xs text-[#1A3472] bg-blue-50
                border border-blue-200 px-2.5 py-1.5 rounded-full font-bold"
            >
              <LayoutDashboard size={11} />
              {profile.role === 'admin' ? '관리자' : '내 가게'}
            </a>
          )}

          {/* 로그인 / 유저 정보 */}
          {isLoading ? null : user ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-2.5 py-1.5 rounded-full">
                {roleBadge && (
                  <span className={`text-[9px] text-white px-1.5 py-0.5 rounded-full font-black ${roleBadge.color}`}>
                    {roleBadge.label}
                  </span>
                )}
                <span className="text-xs font-bold text-gray-700">{displayName}</span>
              </div>
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
              className="flex items-center gap-1 text-xs text-white bg-[#E8521A]
                px-3 py-1.5 rounded-full font-black shadow-md"
            >
              <LogIn size={11} />
              로그인
            </button>
          )}
        </div>
      </header>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          lockedRole={lockedRole}
        />
      )}
    </>
  )
}

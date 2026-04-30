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
      <header className="bg-white border-b border-[#F2F4F6] px-4 py-0 flex items-center justify-between z-30 relative shrink-0 shadow-sm" style={{ height: 56 }}>
        {/* 로고 */}
        <div className="shrink-0 flex items-center" style={{ width: 40, height: 40 }}>
          <img src="/logo.png" alt="신선구조대" style={{ width: 40, height: 40, objectFit: 'contain' }} />
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2">
          {!user && (
            <button onClick={() => openAuth('seller')}
              className="text-xs text-[#0064FF] bg-[#F0F7FF] px-3 py-1.5 rounded-xl font-bold active:scale-95 transition-all">
              <span className="hidden sm:inline">사장님인가요?</span>
              <span className="sm:hidden">입점</span>
            </button>
          )}

          {user && profile && profile.role !== 'user' && (
            <a href={profile.role === 'admin' ? '/admin' : '/seller/dashboard'}
              className="flex items-center gap-1 text-xs text-[#191F28] bg-[#F2F4F6] px-3 py-1.5 rounded-xl font-bold active:scale-95 transition-all">
              <LayoutDashboard size={11} />
              {profile.role === 'admin' ? '관리자' : '내 가게'}
            </a>
          )}

          {isLoading ? null : user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#F2F4F6] px-2.5 py-1.5 rounded-xl">
                {roleBadge && (
                  <span className={`text-[9px] text-white px-1.5 py-0.5 rounded-lg font-black ${roleBadge.color}`}>
                    {roleBadge.label}
                  </span>
                )}
                <span className="text-xs font-bold text-[#191F28]">{displayName}</span>
              </div>
              <button onClick={signOut} className="text-[#8B95A1] hover:text-[#191F28] p-1.5 transition-colors" title="로그아웃">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button onClick={() => openAuth('user')}
              className="text-xs text-white bg-[#0064FF] px-3 py-1.5 rounded-xl font-black shadow-sm active:scale-95 transition-all">
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

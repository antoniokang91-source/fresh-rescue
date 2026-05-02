'use client'

import { useAuth } from '@/lib/auth-context'
import AuthModal from '@/components/auth/AuthModal'

export default function AuthModalWrapper() {
  const { showAuthModal, setShowAuthModal } = useAuth()

  if (!showAuthModal) return null

  return <AuthModal onClose={() => setShowAuthModal(false)} />
}

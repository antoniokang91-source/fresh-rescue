'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import AvatarSelectModal from '@/components/avatar/AvatarSelectModal'
import ReviewModal from '@/components/review/ReviewModal'
import type { Reservation } from '@/types'

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [pendingReservations, setPendingReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [showAvatarEdit, setShowAvatarEdit] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedReservationForReview, setSelectedReservationForReview] = useState<Reservation | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadReservations()
  }, [user, router])

  const loadReservations = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: pendingData, error: pendingError } = await supabase
        .from('reservations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })

      const { data: confirmedData, error: confirmedError } = await supabase
        .from('reservations')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['READY', 'COMPLETED'])
        .order('created_at', { ascending: false })

      if (!pendingError && pendingData) {
        setPendingReservations(pendingData as Reservation[])
      }

      if (!confirmedError && confirmedData) {
        const withReviewStatus = await Promise.all(
          confirmedData.map(async (res: any) => {
            const { data: review } = await supabase
              .from('reviews')
              .select('id')
              .eq('reservation_id', res.id)
              .maybeSingle()
            return { ...res, hasReviewed: !!review }
          })
        )
        setReservations(withReviewStatus as Reservation[])
      }
    } catch (e) {
      console.error('Error loading reservations:', e)
    } finally {
      setLoading(false)
    }
  }

  const handlePickupComplete = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'COMPLETED', pickup_completed_at: new Date().toISOString() })
        .eq('id', reservationId)

      if (error) throw error
      await loadReservations()
    } catch (e) {
      console.error('Error completing pickup:', e)
      alert('픽업 완료 처리에 실패했습니다.')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const handleAvatarSave = async (url: string) => {
    await refreshProfile()
    setShowAvatarEdit(false)
    await new Promise(resolve => setTimeout(resolve, 500))
    router.push('/')
  }

  if (!user || !profile) {
    return <div className="w-full h-screen flex items-center justify-center">로딩 중...</div>
  }

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">프로필</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* 사용자 정보 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">내 정보</h2>

          {/* 캐릭터 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="w-16 h-16 rounded-xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-blue-600 text-white text-3xl font-bold flex items-center justify-center">
                  {profile.nickname?.charAt(0) ?? '👤'}
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">캐릭터</p>
                <p className="text-base font-semibold text-gray-900">{profile.nickname ?? '미설정'}</p>
              </div>
            </div>
            <button
              onClick={() => setShowAvatarEdit(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors active:scale-95"
            >
              변경
            </button>
          </div>

          {/* 기본 정보 */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600 mb-1">닉네임</p>
              <p className="text-base font-semibold text-gray-900">{profile.nickname ?? '미설정'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">전화번호</p>
              <p className="text-base font-semibold text-gray-900">{profile.phone ?? '미설정'}</p>
            </div>
            {profile.role && (
              <div>
                <p className="text-sm text-gray-600 mb-1">역할</p>
                <p className="text-base font-semibold text-gray-900">
                  {profile.role === 'user' ? '구조대원' : profile.role === 'seller' ? '사장님' : '관리자'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 예약 대기 중 */}
        {pendingReservations.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border-l-4 border-blue-500">
            <h2 className="text-lg font-bold text-gray-900">⏳ 예약 확정 대기 중</h2>
            <div className="space-y-3">
              {pendingReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="border border-blue-200 rounded-xl p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{reservation.product_name ?? '상품'}</p>
                      <p className="text-sm text-gray-600 mt-1">수량: {reservation.quantity}개</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
                        대기 중
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    사장님의 확정을 기다리고 있습니다. 곧 연락 드릴게요!
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 구조 내역 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">구조내역</h2>

          {loading ? (
            <p className="text-center text-gray-500 py-8">로딩 중...</p>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">완료된 구조 내역이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map((reservation) => {
                const completedDate = reservation.pickup_completed_at
                  ? new Date(reservation.pickup_completed_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '-'
                const isReady = reservation.status === 'READY'
                const isCompleted = reservation.status === 'COMPLETED'

                return (
                  <div
                    key={reservation.id}
                    className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{reservation.product_name ?? '상품'}</p>
                        <p className="text-sm text-gray-600 mt-1">수량: {reservation.quantity}개</p>
                        {isCompleted && (
                          <p className="text-xs text-gray-500 mt-1">픽업 완료: {completedDate}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                          isReady ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {isReady ? '준비완료' : '구조완료'}
                        </span>
                      </div>
                    </div>
                    {isReady && (
                      <button
                        onClick={() => handlePickupComplete(reservation.id)}
                        className="w-full py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors active:scale-95"
                      >
                        ✓ 픽업 완료
                      </button>
                    )}
                    {isCompleted && !(reservation as any).hasReviewed && (
                      <button
                        onClick={() => {
                          setSelectedReservationForReview(reservation)
                          setShowReviewModal(true)
                        }}
                        className="w-full py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors active:scale-95"
                      >
                        ✍️ 리뷰 작성
                      </button>
                    )}
                    {isCompleted && (reservation as any).hasReviewed && (
                      <button
                        disabled
                        className="w-full py-2 bg-gray-300 text-gray-600 text-sm font-semibold rounded-lg cursor-not-allowed"
                      >
                        ✓ 리뷰작성완료
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 로그아웃 */}
        <div className="pb-4">
          <button
            onClick={handleSignOut}
            className="w-full py-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2 active:scale-95"
          >
            <LogOut size={18} />
            로그아웃
          </button>
        </div>
        </div>
      </div>

      {showAvatarEdit && (
        <AvatarSelectModal
          onClose={() => setShowAvatarEdit(false)}
          onSave={handleAvatarSave}
          currentUrl={profile.avatar_url}
        />
      )}

      {showReviewModal && selectedReservationForReview && (
        <ReviewModal
          reservation={selectedReservationForReview}
          onClose={() => {
            setShowReviewModal(false)
            setSelectedReservationForReview(null)
          }}
          onSuccess={() => {
            setShowReviewModal(false)
            setSelectedReservationForReview(null)
            loadReservations()
          }}
        />
      )}
    </div>
  )
}

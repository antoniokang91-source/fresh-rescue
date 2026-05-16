'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import AvatarSelectModal from '@/components/avatar/AvatarSelectModal'
import ReviewModal from '@/components/review/ReviewModal'
import ReviewSuccessPopup from '@/components/review/ReviewSuccessPopup'
import type { Reservation } from '@/types'

interface RescueStats {
  rescue_level: number
  rescue_activity_score: number
  rescue_badge_count: number
}

interface RescueBadge {
  id: string
  badge_type: string
  badge_name: string
}

interface MonthlyRanking {
  rank_position: number
  activity_score: number
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [pendingReservations, setPendingReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [showAvatarEdit, setShowAvatarEdit] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedReservationForReview, setSelectedReservationForReview] = useState<Reservation | null>(null)
  const [userRank, setUserRank] = useState<number | null>(null)
  const [userCity, setUserCity] = useState<string>('')
  const [isEditingLocation, setIsEditingLocation] = useState(false)
  const [editingLocation, setEditingLocation] = useState('')
  const [locationSearchResults, setLocationSearchResults] = useState<any[]>([])
  const [locationSearchLoading, setLocationSearchLoading] = useState(false)

  // 신선구조 시스템
  const [rescueStats, setRescueStats] = useState<RescueStats | null>(null)
  const [rescueBadges, setRescueBadges] = useState<RescueBadge[]>([])
  const [monthlyRanking, setMonthlyRanking] = useState<MonthlyRanking | null>(null)

  // 리뷰 완료 팝업
  const [showReviewSuccess, setShowReviewSuccess] = useState(false)
  const [reviewSuccessData, setReviewSuccessData] = useState<{
    rankPosition: number
    shopName: string
    activityPoints?: number
    hasPhoto?: boolean
    hasDetailedText?: boolean
  } | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadReservations()
    loadRescueStats()
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

      // 지역 순위 로드
      if (!confirmedData || confirmedData.length === 0) {
        await loadLocalRanking()
      }
    } catch (e) {
      console.error('Error loading reservations:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadLocalRanking = async () => {
    if (!user || !profile) return
    try {
      // 사용자 위치 정보에서 시 추출
      const location = profile.location || ''
      const city = location.split(' ')[0] // 첫 번째 부분이 시
      setUserCity(city)
      setEditingLocation(location)

      // 같은 시에 속한 모든 사용자 조회
      const { data: usersInCity } = await supabase
        .from('members')
        .select('id, nickname, location')
        .ilike('location', `${city}%`)

      if (!usersInCity || usersInCity.length === 0) {
        setUserRank(null)
        return
      }

      // 각 사용자별 CONFIRMED 예약 수 계산
      const userScores = await Promise.all(
        usersInCity.map(async (member: any) => {
          const { count } = await supabase
            .from('reservations')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', member.id)
            .eq('status', 'CONFIRMED')
          return { userId: member.id, count: count || 0, nickname: member.nickname }
        })
      )

      // 점수 기준 내림차순 정렬 후 순위 계산
      const ranked = userScores.sort((a, b) => b.count - a.count)
      const userIndex = ranked.findIndex(r => r.userId === user.id)

      // 같은 점수로 같은 순위를 가지는 경우 처리
      if (userIndex === -1) {
        setUserRank(null)
      } else {
        let rank = 1
        for (let i = 0; i < userIndex; i++) {
          if (ranked[i].count !== ranked[userIndex].count) {
            rank = i + 1
          }
        }
        setUserRank(rank)
      }
    } catch (e) {
      console.error('Error loading local ranking:', e)
      setUserRank(null)
    }
  }

  // 신선구조대 레벨/뱃지/활동도 로드
  const loadRescueStats = async () => {
    if (!user) return
    try {
      // 1. 레벨 및 활동도 조회
      const { data: stats } = await supabase
        .from('members')
        .select('rescue_level, rescue_activity_score, rescue_badge_count')
        .eq('id', user.id)
        .single()

      if (stats) {
        setRescueStats(stats as RescueStats)
      }

      // 2. 뱃지 조회
      const { data: badges } = await supabase
        .from('rescue_badges')
        .select('id, badge_type, badge_name')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })

      if (badges) {
        setRescueBadges(badges as RescueBadge[])
      }

      // 3. 월간 랭킹 조회
      const now = new Date()
      const yearMonth = now.toISOString().slice(0, 7)

      const { data: ranking } = await supabase
        .from('rescue_leaderboard')
        .select('rank_position, activity_score')
        .eq('user_id', user.id)
        .eq('year_month', yearMonth)
        .single()

      if (ranking) {
        setMonthlyRanking(ranking as MonthlyRanking)
      }
    } catch (e) {
      console.error('Error loading rescue stats:', e)
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
    await new Promise(resolve => setTimeout(resolve, 800))
    router.back()
  }

  const searchLocations = async (query: string) => {
    if (!query.trim()) {
      setLocationSearchResults([])
      return
    }
    setLocationSearchLoading(true)
    try {
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`,
        { headers: { Authorization: `KakaoAK ${process.env.NEXT_PUBLIC_KAKAO_API_KEY}` } }
      )
      const data = await response.json()
      setLocationSearchResults((data.documents || []).slice(0, 5))
    } catch (e) {
      console.error('Location search error:', e)
      setLocationSearchResults([])
    } finally {
      setLocationSearchLoading(false)
    }
  }

  const handleLocationSelect = (address: string) => {
    setEditingLocation(address)
    setLocationSearchResults([])
  }

  const handleLocationSave = async () => {
    if (!user || !editingLocation.trim()) return
    try {
      const city = editingLocation.split(' ')[0] || ''
      const { error } = await supabase
        .from('members')
        .update({ location: editingLocation, city: city })
        .eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      setIsEditingLocation(false)
      setLocationSearchResults([])
    } catch (e) {
      console.error('Error saving location:', e)
      alert('위치 정보 저장에 실패했습니다.')
    }
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
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-600 text-white text-3xl font-bold flex items-center justify-center">
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
              className="px-4 py-2 bg-rescue-orange text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors active:scale-95"
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
            {profile.role === 'user' && (
              <div>
                <p className="text-sm text-gray-600 mb-1">📍 위치 정보</p>
                {isEditingLocation ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={editingLocation}
                        onChange={(e) => {
                          setEditingLocation(e.target.value)
                          searchLocations(e.target.value)
                        }}
                        onFocus={() => editingLocation && searchLocations(editingLocation)}
                        placeholder="지역명 검색 (예: 강남구, 서울시)"
                        className="w-full border-2 border-rescue-orange rounded-lg px-3 py-2 text-base font-semibold outline-none"
                      />
                      {locationSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-rescue-orange rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                          {locationSearchResults.map((result, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleLocationSelect(result.address_name)}
                              className="w-full text-left px-3 py-2 hover:bg-orange-50 border-b border-gray-100 last:border-0 text-sm font-medium text-gray-700 transition-colors"
                            >
                              {result.address_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">구조활동 지역을 선택해 주셔야 지역 랭킹에 반영 됩니다</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleLocationSave}
                        className="flex-1 px-4 py-2 bg-rescue-orange text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors active:scale-95"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingLocation(false)
                          setLocationSearchResults([])
                        }}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-colors active:scale-95"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-gray-900">{profile.location ?? '미설정'}</p>
                    <button
                      onClick={() => setIsEditingLocation(true)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors active:scale-95"
                    >
                      변경
                    </button>
                  </div>
                )}
              </div>
            )}
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

        {/* 신선구조대 레벨/뱃지/활동도 */}
        {rescueStats && (
          <div className="bg-gradient-to-br from-rescue-orange/10 to-orange-50 rounded-2xl p-6 shadow-sm space-y-5 border border-rescue-orange/20">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">🚨 신선구조대 활동</h2>

            {/* 레벨 + 진행도 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">신선구조대 레벨</p>
                  <p className="text-2xl font-black text-rescue-orange">
                    Level {rescueStats.rescue_level}
                    <span className="text-sm text-gray-600 ml-2">
                      {['', '신입', '구조원', '시니어', '구조대원', '구조대장'][rescueStats.rescue_level]}
                    </span>
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-rescue-orange h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((rescueStats.rescue_level / 5) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* 활동도 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/60 rounded-xl p-4">
                <p className="text-xs text-gray-600 mb-1">구조 활동도</p>
                <p className="text-2xl font-bold text-rescue-orange">{rescueStats.rescue_activity_score}</p>
                <p className="text-xs text-gray-500 mt-1">포인트</p>
              </div>
              <div className="bg-white/60 rounded-xl p-4">
                <p className="text-xs text-gray-600 mb-1">수집 뱃지</p>
                <p className="text-2xl font-bold text-rescue-orange">{rescueStats.rescue_badge_count}</p>
                <p className="text-xs text-gray-500 mt-1">개</p>
              </div>
            </div>

            {/* 월간 랭킹 */}
            {monthlyRanking && (
              <div className="bg-white/60 rounded-xl p-4 border border-orange-200">
                <p className="text-xs text-gray-600 mb-2">이번 달 랭킹</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-rescue-orange">{monthlyRanking.rank_position}</p>
                  <p className="text-sm text-gray-600">위 (활동도 {monthlyRanking.activity_score}점)</p>
                </div>
              </div>
            )}

            {/* 뱃지 갤러리 */}
            {rescueBadges.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">🎖️ 획득 뱃지</p>
                <div className="grid grid-cols-4 gap-2">
                  {rescueBadges.slice(0, 8).map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-white rounded-lg p-2 text-center hover:shadow-md transition-shadow cursor-help"
                      title={badge.badge_name}
                    >
                      <p className="text-2xl mb-1">🏅</p>
                      <p className="text-xs text-gray-700 line-clamp-2">{badge.badge_name}</p>
                    </div>
                  ))}
                </div>
                {rescueBadges.length > 8 && (
                  <p className="text-xs text-gray-500 text-center mt-2">+{rescueBadges.length - 8}개 더보기</p>
                )}
              </div>
            )}
          </div>
        )}

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

        {/* 구조 완료 내역 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">구조완료내역 ({reservations.length})</h2>

          {loading ? (
            <p className="text-center text-gray-500 py-8">로딩 중...</p>
          ) : reservations.length === 0 ? (
            <div className="space-y-6">
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">완료된 구조 내역이 없습니다</p>
              </div>

              {/* 우리동네 구조대원 순위 */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <h3 className="text-base font-bold text-gray-900 mb-4">우리동네 구조대원 순위는?</h3>
                {userRank ? (
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center">
                      <div className="text-5xl font-black text-blue-600">{userRank}</div>
                      <div className="text-2xl font-black text-blue-600 ml-2">등</div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">{userCity} 지역 구조대원 중</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-600 font-semibold mb-2">당신의 '구조력'을 보여주세요!</p>
                    <p className="text-sm text-gray-500">첫 구조를 완료하면 순위가 계산됩니다</p>
                  </div>
                )}
              </div>
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
                        className="w-full py-2 bg-rescue-orange text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors active:scale-95"
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

        {/* 약관 및 정책 */}
        <div className="space-y-2 pb-4 border-t border-gray-200 pt-4">
          <button
            onClick={() => window.location.href = '/terms'}
            className="w-full py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            서비스 이용약관
          </button>
          <button
            onClick={() => window.location.href = '/privacy'}
            className="w-full py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            개인정보 처리방침
          </button>
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
          onSuccess={(rankPosition, shopName, activityPoints, hasPhoto, hasDetailedText) => {
            setShowReviewModal(false)
            setSelectedReservationForReview(null)
            setReviewSuccessData({ rankPosition, shopName, activityPoints, hasPhoto, hasDetailedText })
            setShowReviewSuccess(true)
            loadReservations()
            loadRescueStats()
          }}
        />
      )}

      {showReviewSuccess && reviewSuccessData && (
        <ReviewSuccessPopup
          shopName={reviewSuccessData.shopName}
          rankPosition={reviewSuccessData.rankPosition}
          activityPoints={reviewSuccessData.activityPoints}
          hasPhoto={reviewSuccessData.hasPhoto}
          hasDetailedText={reviewSuccessData.hasDetailedText}
          onClose={() => {
            setShowReviewSuccess(false)
            setReviewSuccessData(null)
          }}
        />
      )}
    </div>
  )
}

'use client'

import { useEffect } from 'react'

interface ReviewSuccessPopupProps {
  shopName: string
  rankPosition: number
  onClose: () => void
  activityPoints?: number
  hasPhoto?: boolean
  hasDetailedText?: boolean
}

export default function ReviewSuccessPopup({
  shopName,
  rankPosition,
  onClose,
  activityPoints = 10,
  hasPhoto = false,
  hasDetailedText = false,
}: ReviewSuccessPopupProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  // 활동도 포인트 계산
  let totalPoints = activityPoints
  const bonuses: string[] = []

  if (hasPhoto) {
    totalPoints += 5
    bonuses.push('사진 첨부 +5점')
  }
  if (hasDetailedText) {
    totalPoints += 5
    bonuses.push('상세 리뷰 +5점')
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none animate-in fade-in slide-in-from-top">
      <div className="mx-auto max-w-md pointer-events-auto m-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-5 shadow-2xl space-y-3">
        <div className="text-center">
          <p className="text-center font-black text-xl">
            ✅ 리뷰 등록 완료!
          </p>
          <p className="text-center text-sm mt-1 opacity-90">
            신선함을 지키는 구조활동을 감사합니다! 🙏
          </p>
        </div>

        {/* 구조 활동도 */}
        <div className="bg-white/20 rounded-lg p-3 space-y-2">
          <p className="text-sm font-semibold text-center">📊 구조 활동도</p>
          <div className="flex justify-center items-baseline gap-1">
            <span className="text-3xl font-black">+{totalPoints}</span>
            <span className="text-sm opacity-90">포인트</span>
          </div>
          {bonuses.length > 0 && (
            <div className="text-xs space-y-1 mt-2 border-t border-white/30 pt-2">
              {bonuses.map((bonus, i) => (
                <p key={i} className="text-center opacity-90">✨ {bonus}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

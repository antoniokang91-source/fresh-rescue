'use client'

import { useEffect } from 'react'

interface ReviewSuccessPopupProps {
  shopName: string
  rankPosition: number
  onClose: () => void
}

export default function ReviewSuccessPopup({ shopName, rankPosition, onClose }: ReviewSuccessPopupProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none animate-in fade-in slide-in-from-top">
      <div className="mx-auto max-w-md pointer-events-auto m-4 bg-green-500 text-white rounded-2xl p-4 shadow-xl">
        <p className="text-center font-bold text-lg">
          🌟 리뷰 등록 완료!
        </p>
        <p className="text-center text-sm mt-2">
          현재 <strong>{shopName}</strong> 랭킹은 <strong>{rankPosition}위</strong>입니다.
        </p>
      </div>
    </div>
  )
}

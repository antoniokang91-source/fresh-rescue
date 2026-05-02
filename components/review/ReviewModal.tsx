'use client'

import { useState, useRef } from 'react'
import { X, Star, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { Reservation } from '@/types'

interface ReviewModalProps {
  reservation: Reservation
  onClose: () => void
  onSuccess: (rankPosition: number, shopName: string) => void
}

const AUTO_COMMENT_EXAMPLES = [
  '싸고 신선해서 좋았어요!',
  '가격 대비 최고예요!',
  '자주 이용할게요!',
  '포장이 깔끔했어요!',
]

export default function ReviewModal({ reservation, onClose, onSuccess }: ReviewModalProps) {
  const { user } = useAuth()
  const [rating, setRating] = useState(0)
  const [freshness, setFreshness] = useState(0)
  const [comment, setComment] = useState('')
  const [selectedAutoComment, setSelectedAutoComment] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isTimeExpired = reservation.pickup_completed_at
    ? (Date.now() - new Date(reservation.pickup_completed_at).getTime()) / (1000 * 60 * 60) > 24
    : false

  const canSubmit = rating > 0 && freshness > 0 && !loading

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = (evt) => setPhotoPreview(evt.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (e) => {
        const img = new Image()
        img.src = e.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          const maxWidth = 800, maxHeight = 800
          let width = img.width, height = img.height
          if (width > height) {
            if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth }
          } else {
            if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight }
          }
          canvas.width = width; canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7)
        }
      }
    })
  }

  const handleSubmit = async () => {
    if (!user || !canSubmit) return
    if (isTimeExpired) {
      setError('24시간이 지나 리뷰를 작성할 수 없습니다.')
      return
    }

    setLoading(true)
    setError('')
    try {
      let photoUrl: string | null = null
      if (photoFile) {
        const compressed = await compressImage(photoFile)
        const fileName = `${user.id}/${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('review-images')
          .upload(fileName, compressed)
        if (uploadError) throw uploadError
        photoUrl = supabase.storage.from('review-images').getPublicUrl(fileName).data.publicUrl
      }

      const finalComment = selectedAutoComment || comment || null
      const { error: insertError } = await supabase.from('reviews').insert({
        reservation_id: reservation.id,
        user_id: user.id,
        shop_id: reservation.shop_id,
        product_id: reservation.product_id,
        rating,
        freshness_score: freshness,
        comment: finalComment,
        photo_url: photoUrl,
        is_auto_comment: !!selectedAutoComment,
      })

      if (insertError) throw insertError

      // Trigger 실행 후 랭킹 조회
      const { data: ranking } = await supabase
        .from('shop_rankings')
        .select('rank_position, shop_name')
        .eq('shop_id', reservation.shop_id)
        .single()

      onSuccess(ranking?.rank_position ?? 1, ranking?.shop_name ?? '가게')
    } catch (err: any) {
      setError(err.message || '리뷰 작성 실패')
    } finally {
      setLoading(false)
    }
  }

  if (isTimeExpired) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-sm">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl p-6">
          <p className="text-center text-gray-600">리뷰 작성 기간이 지났습니다 (24시간 이내).</p>
          <button
            onClick={onClose}
            className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-semibold"
          >
            닫기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-blue-600 text-white p-6 rounded-t-3xl flex items-center justify-between">
          <h2 className="text-lg font-bold">구조 상품 리뷰</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* 별점 */}
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">⭐ 별점을 선택해주세요</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  className={`w-12 h-12 rounded-lg transition-all ${
                    rating >= r ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-300'
                  }`}
                >
                  <Star className="w-6 h-6 mx-auto fill-current" />
                </button>
              ))}
            </div>
            {rating > 0 && <p className="text-xs text-gray-500 mt-2">{rating}점 선택됨</p>}
          </div>

          {/* 신선도 */}
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">🌿 신선도를 평가해주세요</p>
            <div className="flex flex-col gap-2">
              {[
                { value: 1, label: '보통이에요', emoji: '🌿' },
                { value: 2, label: '신선해요', emoji: '🌱' },
                { value: 3, label: '매우 신선해요', emoji: '✨' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFreshness(f.value)}
                  className={`py-3 px-4 rounded-xl font-semibold transition-all border-2 ${
                    freshness === f.value
                      ? 'bg-green-50 border-green-500 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  {f.emoji} {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 리뷰 내용 */}
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">💬 리뷰 내용 (선택)</p>

            {selectedAutoComment ? (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <p className="text-sm font-semibold text-blue-700">선택한 문구: {selectedAutoComment}</p>
                <button
                  onClick={() => setSelectedAutoComment(null)}
                  className="text-xs text-blue-600 mt-2 underline"
                >
                  변경하기
                </button>
              </div>
            ) : (
              <>
                <div className="mb-3 space-y-2">
                  {AUTO_COMMENT_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setSelectedAutoComment(example)
                        setComment('')
                      }}
                      className="w-full text-left p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium text-gray-800"
                    >
                      {example}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-gray-500 text-center mb-2">또는 직접 작성</p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="직접 작성하려면 여기에 입력..."
                  className="w-full p-3 border-2 border-gray-200 rounded-lg outline-none focus:border-blue-600 text-sm resize-none"
                  rows={3}
                />
              </>
            )}
          </div>

          {/* 사진 업로드 */}
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">📷 사진 (선택)</p>
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={photoPreview} alt="preview" className="w-full h-40 object-cover" />
                <button
                  onClick={() => {
                    setPhotoFile(null)
                    setPhotoPreview(null)
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <Camera className="w-6 h-6 text-gray-400" />
                <p className="text-sm font-semibold text-gray-600">사진 추가</p>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
              canSubmit ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {loading ? '리뷰 저장 중...' : '리뷰 작성 완료'}
          </button>
        </div>
      </div>
    </div>
  )
}

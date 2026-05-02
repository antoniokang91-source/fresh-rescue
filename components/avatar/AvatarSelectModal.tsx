'use client'

import { useState, useRef } from 'react'
import { X, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

interface AvatarSelectModalProps {
  onClose: () => void
  onSave: (url: string) => void
  currentUrl?: string | null
  canSkip?: boolean
}

const DEFAULT_AVATARS = [
  '/avatars/default1.svg',
  '/avatars/default2.svg',
  '/avatars/default3.svg',
  '/avatars/default4.svg',
  '/avatars/default5.svg',
]

export default function AvatarSelectModal({ onClose, onSave, currentUrl, canSkip = false }: AvatarSelectModalProps) {
  const { user, refreshProfile } = useAuth()
  const [selectedUrl, setSelectedUrl] = useState<string | null>(currentUrl ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          const maxSize = 400
          let width = img.width, height = img.height
          if (width > height) {
            if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize }
          } else {
            if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize }
          }
          canvas.width = width; canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7)
        }
      }
    })
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')
    try {
      const compressed = await compressImage(file)
      const fileName = `${user.id}/avatar.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressed, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      const url = data.publicUrl
      setSelectedUrl(url)
    } catch (err: any) {
      setError(err.message || '이미지 업로드 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user || !selectedUrl) return

    setLoading(true)
    setError('')
    try {
      const { error: updateError } = await supabase
        .from('members')
        .update({ avatar_url: selectedUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      await refreshProfile()
      onSave(selectedUrl)
    } catch (err: any) {
      setError(err.message || '저장 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    if (!user) return

    setLoading(true)
    try {
      const randomUrl = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]
      const { error: updateError } = await supabase
        .from('members')
        .update({ avatar_url: randomUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      await refreshProfile()
      onClose()
    } catch (err: any) {
      setError(err.message || '저장 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-blue-600 text-white p-6 rounded-t-3xl flex items-center justify-between">
          <h2 className="text-lg font-bold">캐릭터 선택</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* 기본 캐릭터 */}
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">🎨 기본 캐릭터 선택</p>
            <div className="grid grid-cols-5 gap-3">
              {DEFAULT_AVATARS.map((url) => (
                <button
                  key={url}
                  onClick={() => setSelectedUrl(url)}
                  className={`w-16 h-16 rounded-xl transition-all border-2 overflow-hidden flex-shrink-0 ${
                    selectedUrl === url
                      ? 'border-blue-600 ring-2 ring-blue-300 scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img src={url} alt="avatar" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* 사진 업로드 */}
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">📷 내 사진 업로드</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Upload className="w-6 h-6 text-gray-400" />
              <p className="text-sm font-semibold text-gray-600">사진 업로드</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
              disabled={loading}
            />
          </div>

          {/* 미리보기 */}
          {selectedUrl && !selectedUrl.startsWith('/avatars/default') && (
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-xs text-gray-600 mb-2">미리보기</p>
              <div className="w-20 h-20 rounded-xl overflow-hidden mx-auto">
                <img src={selectedUrl} alt="preview" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

          <button
            onClick={handleSave}
            disabled={!selectedUrl || loading}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
              selectedUrl && !loading ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {loading ? '저장 중...' : '저장하기'}
          </button>

          {canSkip && (
            <button
              onClick={handleSkip}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              나중에 하기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

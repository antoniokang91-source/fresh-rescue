'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase' // 🟢 추가된 부분

interface JoinModalProps {
  onClose: () => void
}

export default function JoinModal({ onClose }: JoinModalProps) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [marketingAgree, setMarketingAgree] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false) // 🟢 중복 클릭 방지

  const handleJoin = async () => {
    const rawPhone = phone.replace(/-/g, '')
    if (rawPhone.length < 10) return alert("핸드폰 번호를 정확히 입력해주세요.")
    if (password.length < 6) return alert("비밀번호를 6자리 이상 설정해주세요.")

    setIsSubmitting(true)

    try {
      const email = `${rawPhone}@fruitrescue.app`

      // 1. Supabase Auth 계정 생성 시도
      const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password })

      if (signUpError) {
        // 이미 가입된 경우 → 로그인 시도
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
          if (signInError) {
            alert("비밀번호가 올바르지 않습니다.")
            return
          }
          alert("🚨 신선구조대 복귀 완료! 작전을 재개합니다.")
          onClose()
          window.location.reload()
          return
        }
        throw signUpError
      }

      const userId = authData.user?.id
      if (!userId) throw new Error('계정 생성에 실패했습니다.')

      // 2. members 테이블에 저장 후 rescuers(실고객) 활동 레코드 생성
      const { error: upsertError } = await supabase.from('members').upsert({
        id: userId,
        nickname: `대원_${rawPhone.slice(-4)}`,
        phone: rawPhone,
        is_registered: true,
        marketing_agree: marketingAgree,
        role: 'user',
      })
      if (upsertError) throw upsertError

      alert("🚨 신선구조대 합류 성공! 작전을 시작합니다.")
      onClose()
      window.location.reload()
    } catch (err: any) {
      console.error("가입 에러:", err)
      alert(err.message || "가입 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="bg-siren-red p-6 text-white text-center">
          <h2 className="text-2xl font-black">🚨 신선구조대 합류</h2>
          <p className="text-sm opacity-90 mt-1">번호만 입력하고 득템 알람 받으세요!</p>
        </div>
        
        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-bold text-gray-400 ml-1">핸드폰 번호</label>
            <input 
              type="tel" 
              placeholder="01012345678" 
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg focus:border-siren-red outline-none transition-all"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 ml-1">간편 비밀번호</label>
            <input 
              type="password" 
              placeholder="6자리 이상 입력" 
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg focus:border-siren-red outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-6 h-6 mt-1 accent-siren-red"
                checked={marketingAgree}
                onChange={(e) => setMarketingAgree(e.target.checked)}
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <span className="font-bold text-gray-700 text-sm">[선택] AI 실시간 추천 알람 동의</span>
                <p className="text-[11px] text-gray-500 leading-tight mt-1">
                  내 주변 500m 이내 초특가 마감 상품이 뜨면<br/> 누구보다 빠르게 푸시 알람을 보내드립니다.
                </p>
              </div>
            </label>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-4 font-bold text-gray-400" disabled={isSubmitting}>닫기</button>
            <button 
              onClick={handleJoin}
              disabled={isSubmitting}
              className={`flex-[2] text-white py-4 rounded-2xl text-xl font-black shadow-lg transition active:scale-95 ${isSubmitting ? 'bg-gray-400' : 'bg-siren-red shadow-red-100'}`}
            >
              {isSubmitting ? "통신 중..." : "가입하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
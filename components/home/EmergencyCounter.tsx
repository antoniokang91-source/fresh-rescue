'use client'

import { useEffect, useRef, useState } from 'react'

const RESCUE_COUNT = 247

export default function EmergencyCounter() {
  const [count, setCount] = useState(0)
  const animated = useRef(false)

  useEffect(() => {
    if (animated.current) return
    animated.current = true

    const target = RESCUE_COUNT
    const duration = 1800
    const startTime = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [])

  const segments = [
    `오늘 우리 동네에서 🍎 ${count.toLocaleString()}개의 상품이 구조되었습니다!`,
    '지금도 구조 작전은 계속됩니다! 출동하세요!',
    '🚨 마감 임박 상품들이 여러분을 기다립니다!',
    `🏆 오늘의 구조 목표: ${(RESCUE_COUNT + 53).toLocaleString()}개`,
  ]
  const tickerText = segments.join('      ') + '      '

  return (
    <div className="bg-dark-base h-8 flex items-center overflow-hidden shrink-0">
      {/* 긴급 배지 */}
      <div className="flex items-center gap-1.5 px-3 shrink-0 border-r border-gray-700 h-full">
        <span className="text-siren-red animate-pulse text-xs">🚨</span>
        <span className="text-siren-red text-[10px] font-black tracking-wider">긴급</span>
      </div>

      {/* 마퀴 영역 */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <div
          className="whitespace-nowrap text-safe-green font-mono text-xs flex"
          style={{ animation: 'marquee 30s linear infinite' }}
        >
          {/* 두 번 반복 = seamless loop */}
          <span>{tickerText + tickerText}</span>
        </div>
      </div>

      {/* 우측 구조 카운터 강조 */}
      <div className="flex items-center gap-1 px-3 shrink-0 border-l border-gray-700 h-full">
        <span className="text-urgent-yellow font-black text-xs tabular-nums">
          {count.toLocaleString()}
        </span>
        <span className="text-gray-500 text-[10px]">구조</span>
      </div>
    </div>
  )
}

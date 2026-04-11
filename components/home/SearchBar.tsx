'use client'

import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  resultCount?: number
}

export default function SearchBar({ value, onChange, resultCount }: SearchBarProps) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-32px)] max-w-sm">
      {/* 입력창 */}
      <div className="bg-white/92 backdrop-blur-md rounded-2xl shadow-xl shadow-black/10 border border-white/60 flex items-center gap-2.5 px-4 py-3">
        <Search size={16} className="text-rescue-orange shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="상품 검색... (예: 사과, 삼겹살)"
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none min-w-0"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            aria-label="검색어 지우기"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 검색 결과 안내 */}
      {value && (
        <div className="mt-2 flex justify-center">
          <span className="text-xs bg-dark-base/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-full shadow-md">
            {resultCount === 0 ? (
              '검색 결과가 없습니다'
            ) : (
              <>
                <span className="text-urgent-yellow font-black">{resultCount}</span>
                개 가게에서 판매 중 · 마커를 탭하세요
              </>
            )}
          </span>
        </div>
      )}
    </div>
  )
}

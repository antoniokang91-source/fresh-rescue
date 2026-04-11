'use client'

import { FilterType } from '@/types'

const FILTERS: { id: FilterType; emoji: string; label: string; sub: string }[] = [
  { id: 'nearest', emoji: '⚡', label: '급처순', sub: '마감 임박' },
  { id: 'recommended', emoji: '⭐', label: '추천', sub: '인기 가게' },
]

interface FilterBarProps {
  activeFilter: FilterType
  onFilterChange: (filter: FilterType) => void
}

export default function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
    <div className="flex gap-2.5 px-4 py-3 bg-white border-t border-gray-100 shrink-0">
      {FILTERS.map((f) => {
        const isActive = activeFilter === f.id
        return (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`
              flex-1 flex flex-col items-center py-2.5 rounded-2xl text-sm font-bold
              transition-all duration-200 active:scale-95
              ${
                isActive
                  ? 'bg-rescue-orange text-white shadow-lg shadow-orange-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }
            `}
          >
            <span className="text-base leading-none mb-0.5">{f.emoji}</span>
            <span className="text-xs font-black">{f.label}</span>
            <span
              className={`text-[10px] font-normal mt-0.5 ${
                isActive ? 'text-orange-100' : 'text-gray-400'
              }`}
            >
              {f.sub}
            </span>
          </button>
        )
      })}
    </div>
  )
}

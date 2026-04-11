import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Product } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원'
}

export function getDiscountRate(product: Product): number {
  return Math.round(
    ((product.originalPrice - product.rescuePrice) / product.originalPrice) * 100
  )
}

export function timeUntilExpiry(expireTime: string): string {
  const diff = new Date(expireTime).getTime() - Date.now()
  if (diff <= 0) return '만료됨'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (hours > 0) return `${hours}시간 ${minutes}분`
  if (minutes > 0) return `${minutes}분 ${seconds}초`
  return `${seconds}초`
}

/** 1시간 이내 만료 → 긴급 */
export function isUrgent(expireTime: string): boolean {
  const diff = new Date(expireTime).getTime() - Date.now()
  return diff > 0 && diff < 60 * 60 * 1000
}

/** 30분 이내 만료 → 위험 */
export function isCritical(expireTime: string): boolean {
  const diff = new Date(expireTime).getTime() - Date.now()
  return diff > 0 && diff < 30 * 60 * 1000
}

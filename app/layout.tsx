import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

export const metadata: Metadata = {
  title: '신선구조대',
  description:
    '버려질 위기의 상품을 구출하라! 우리 동네 오프라인 소상공인 실시간 재고 구조 작전 서비스',
  keywords: ['신선구조대', '재고 할인', '소상공인', '지역 상권', '음식물 낭비'],
  openGraph: {
    title: '신선구조대',
    description: '버려질 위기의 상품을 구출하라!',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY

  return (
    <html lang="ko">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        {kakaoKey ? (
          <Script
            src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false&libraries=services`}
            strategy="afterInteractive"
          />
        ) : null}
      </body>

    </html>
  )
}

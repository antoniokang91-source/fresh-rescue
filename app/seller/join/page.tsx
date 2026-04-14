import Link from 'next/link'
import { CheckCircle2, ChevronRight, Store, TrendingUp, Megaphone, Shield } from 'lucide-react'

const BENEFITS = [
  {
    icon: '📦',
    title: '재고 소진 걱정 끝!',
    desc: '유통기한 임박 상품을 실시간으로 등록해 주변 구조대원에게 알립니다.',
  },
  {
    icon: '🗺️',
    title: '카카오 지도 노출',
    desc: '우리 가게가 지도 핀으로 표시돼 반경 1km 고객에게 즉시 노출됩니다.',
  },
  {
    icon: '🤖',
    title: 'AI 홍보 문구 자동 생성',
    desc: 'Gemini AI가 상품별 긴급 브리핑 문구를 자동으로 작성해드립니다.',
  },
  {
    icon: '📣',
    title: '광고로 더 많은 노출',
    desc: '긴급 지원 광고를 신청하면 지도 최상단과 검색 결과 우선 노출!',
  },
]

const STEPS = [
  { num: '01', title: '사업자 정보 등록', desc: '상호명, 주소, 카테고리 등록' },
  { num: '02', title: '입점 심사 (24시간)', desc: '관리자가 검토 후 승인 처리' },
  { num: '03', title: '상품 긴급 등록', desc: '할인가·재고·마감시간 설정' },
  { num: '04', title: '구조 작전 개시!', desc: '지도에 핀이 등록되고 구조대원 출동' },
]

export default function SellerJoinPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 text-rescue-orange font-black text-lg">
          🚑 신선구조대
        </Link>
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          메인으로
        </Link>
      </header>

      {/* 히어로 */}
      <section className="bg-gradient-to-br from-rescue-orange to-orange-600 text-white px-6 py-12">
        <div className="max-w-lg mx-auto text-center">
          <div className="text-5xl mb-4">🏪</div>
          <h1 className="text-2xl font-black leading-tight mb-3">
            사장님의 재고를<br />구조대원이 직접 구출합니다!
          </h1>
          <p className="text-orange-100 text-sm leading-relaxed mb-6">
            버려질 위기의 상품을 지역 주민에게 연결해<br />
            매출 손실을 최소화하세요.
          </p>
          <div className="flex gap-2 justify-center text-xs">
            {['무료 입점', '즉시 노출', 'AI 자동 홍보'].map((t) => (
              <span key={t} className="bg-white/20 px-3 py-1.5 rounded-full font-bold">
                ✓ {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 혜택 */}
      <section className="px-6 py-8 max-w-lg mx-auto">
        <h2 className="font-black text-lg text-gray-900 mb-5 flex items-center gap-2">
          <TrendingUp size={20} className="text-rescue-orange" />
          입점 혜택
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="bg-white rounded-2xl p-4 flex gap-4 shadow-sm">
              <span className="text-3xl shrink-0">{b.icon}</span>
              <div>
                <p className="font-black text-gray-900 text-sm">{b.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 입점 절차 */}
      <section className="bg-white px-6 py-8">
        <div className="max-w-lg mx-auto">
          <h2 className="font-black text-lg text-gray-900 mb-5 flex items-center gap-2">
            <Store size={20} className="text-rescue-orange" />
            입점 절차
          </h2>
          <div className="space-y-4">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-rescue-orange text-white rounded-2xl flex items-center justify-center font-black text-sm shrink-0">
                  {s.num}
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-black text-gray-900 text-sm">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="absolute mt-10 ml-5 w-px h-4 bg-gray-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 광고 안내 */}
      <section className="px-6 py-8 max-w-lg mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone size={18} className="text-amber-600" />
            <h3 className="font-black text-amber-800">긴급 지원 광고</h3>
          </div>
          <ul className="space-y-2 text-sm text-amber-700">
            {[
              '지도에서 내 가게 마커 최우선 표시',
              '검색 결과 상단 노출',
              '주변 구조대원 푸시 알림',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-amber-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-amber-500 mt-3">* 입점 후 대시보드에서 광고 신청 가능</p>
        </div>
      </section>

      {/* 개인정보 안내 */}
      <section className="px-6 pb-4 max-w-lg mx-auto">
        <div className="bg-gray-100 rounded-xl p-3.5 flex items-start gap-2">
          <Shield size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-gray-400 leading-relaxed">
            입점 시 수집된 사업자 정보는 서비스 제공 목적으로만 사용되며,
            제3자에게 제공되지 않습니다. (개인정보 보호법 준수)
          </p>
        </div>
      </section>

      {/* 고정 CTA */}
      <div className="sticky bottom-0 bg-white border-t px-6 py-4">
        <Link
          href="/seller/dashboard"
          className="flex items-center justify-center gap-2 w-full py-4 bg-rescue-orange
            text-white font-black text-base rounded-2xl shadow-lg shadow-orange-200
            active:scale-95 transition-transform"
        >
          <Store size={18} />
          무료로 입점 신청하기
          <ChevronRight size={18} />
        </Link>
        <p className="text-center text-xs text-gray-400 mt-2">
          이미 계정이 있으신가요?{' '}
          <Link href="/" className="text-rescue-orange font-bold underline">
            바로 로그인
          </Link>
        </p>
      </div>
    </div>
  )
}

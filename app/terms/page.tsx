'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TermsPage() {
  const router = useRouter()

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">서비스 이용약관</h1>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
          <div className="text-xs text-gray-500 pb-4 border-b border-gray-200">
            최종 수정일: 2026년 5월 12일
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제1조 목적</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              본 약관은 Fruit Rescue(이하 "서비스")를 이용하는 이용자의 권리, 의무 및 책임사항과 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제2조 용어의 정의</h2>
            <ul className="text-sm text-gray-700 leading-relaxed space-y-2">
              <li><strong>회원</strong>: 본 약관에 동의하고 서비스에 가입한 자</li>
              <li><strong>사장님</strong>: 식품을 등록하여 판매하는 회원</li>
              <li><strong>구조대원</strong>: 식품을 구조(구매)하는 회원</li>
              <li><strong>상품</strong>: 사장님이 등록한 식품</li>
              <li><strong>예약</strong>: 구조대원이 상품을 구조하기 위해 신청하는 행위</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제3조 약관의 효력 및 변경</h2>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li>본 약관은 서비스에 게시함으로써 효력을 발생합니다.</li>
              <li>회사는 필요시 약관을 변경할 수 있으며, 변경된 약관은 서비스 내에 공지합니다.</li>
              <li>회원이 변경된 약관에 동의하지 않으면 서비스 이용을 중단할 수 있습니다.</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제4조 회원의 의무</h2>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li>회원은 정확한 개인정보를 제공하여야 합니다.</li>
              <li>회원은 자신의 계정 정보를 보호할 책임을 가집니다.</li>
              <li>회원은 타인의 계정을 도용하거나 악용할 수 없습니다.</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제5조 금지 사항</h2>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">회원은 다음 행위를 할 수 없습니다:</p>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li>불법적인 콘텐츠 등록 또는 거래</li>
              <li>타인의 명예를 훼손하는 행위</li>
              <li>스팸, 사기, 사기행위</li>
              <li>부정확한 상품정보 제공</li>
              <li>예약 취소 및 노쇼(No-Show) 반복</li>
              <li>서비스 시스템을 해킹하거나 부정한 방법으로 이용</li>
              <li>다른 회원을 괴롭히거나 협박하는 행위</li>
              <li>상품의 불법 복제 또는 판매</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제6조 상품 거래</h2>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">사장님의 책임</h3>
              <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
                <li>등록한 상품은 정확한 정보이어야 합니다.</li>
                <li>신선도, 품질, 수량을 명시해야 합니다.</li>
                <li>예약된 상품을 약속한 시간에 준비해야 합니다.</li>
              </ol>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900">구조대원의 책임</h3>
              <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
                <li>정확한 연락처를 제공해야 합니다.</li>
                <li>약속된 시간에 상품을 픽업해야 합니다.</li>
                <li>예약 후 취소할 경우 사전에 알려야 합니다.</li>
              </ol>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제7조 예약 및 환불</h2>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li>예약 취소는 픽업 24시간 전까지 가능합니다.</li>
              <li>환불은 취소 신청 후 영업일 기준 3일 이내에 처리됩니다.</li>
              <li>고의적인 노쇼(No-Show)는 계정 제재 대상입니다.</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제8조 리뷰 및 평가</h2>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li>회원은 거래 완료 후 정직한 리뷰를 작성할 수 있습니다.</li>
              <li>거짓되거나 모욕적인 리뷰는 삭제될 수 있습니다.</li>
              <li>리뷰는 다른 회원의 거래 판단에 영향을 미치므로 신중하게 작성해야 합니다.</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제9조 개인정보 보호</h2>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li>회사는 회원의 개인정보를 안전하게 보호합니다.</li>
              <li>개인정보 수집 및 이용에 대한 자세한 사항은 개인정보 처리방침을 참고하세요.</li>
              <li>회원은 자신의 개인정보 공개 범위를 설정할 수 있습니다.</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제10조 서비스 이용 제한</h2>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">회사는 다음의 경우 회원의 서비스 이용을 제한할 수 있습니다:</p>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li>본 약관 또는 관련 법규를 위반한 경우</li>
              <li>반복적인 금지 사항 위반</li>
              <li>다른 회원에게 피해를 주는 행위</li>
              <li>부정한 방법으로 서비스를 이용한 경우</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제11조 면책 조항</h2>
            <div className="space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">회사는 다음의 경우 책임을 지지 않습니다:</p>
              <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
                <li>회원 간의 거래 분쟁</li>
                <li>상품의 품질 또는 신선도 문제</li>
                <li>자연재해, 전쟁, 테러 등 불가항력적 사건</li>
                <li>회원이 제공한 정보의 정확성</li>
              </ol>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">회사는 서비스를 "있는 그대로" 제공하며, 특정 목적에 대한 적합성을 보증하지 않습니다.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제12조 서비스 중단</h2>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li>회사는 시스템 점검, 운영상 필요에 의해 서비스를 중단할 수 있습니다.</li>
              <li>서비스 중단 시 사전에 공지합니다. (긴급 상황 제외)</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제13조 분쟁 해결</h2>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li>거래 분쟁은 먼저 당사자 간 협의로 해결합니다.</li>
              <li>합의가 되지 않을 경우 회사에 분쟁 조정을 요청할 수 있습니다.</li>
              <li>법적 분쟁은 관할 법원의 판단에 따릅니다.</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제14조 약관의 해석</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              본 약관의 해석에 있어 불명확한 사항은 회사와 회원의 합의 또는 관련 법규에 따릅니다.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제15조 기타</h2>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li>본 약관은 대한민국 법률에 따라 해석됩니다.</li>
              <li>약관의 일부가 무효하더라도 나머지 조항은 유효합니다.</li>
            </ol>
          </section>

          <div className="pt-6 border-t border-gray-200 space-y-2">
            <p className="text-xs text-gray-500">
              <strong>문의:</strong> support@fruit-rescue.app
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

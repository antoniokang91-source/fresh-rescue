'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
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
        <h1 className="text-lg font-bold">개인정보 처리방침</h1>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
          <div className="text-xs text-gray-500 pb-4 border-b border-gray-200">
            최종 수정일: 2026년 5월 12일
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제1조 개인정보의 수집</h2>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">1. 수집 항목</h3>
              <p className="text-sm text-gray-700">Fruit Rescue는 다음과 같은 개인정보를 수집합니다:</p>

              <div className="space-y-2 text-sm text-gray-700">
                <div>
                  <p className="font-semibold">필수 수집 항목:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>전화번호</li>
                    <li>닉네임</li>
                    <li>이메일 주소</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold">선택 수집 항목:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>프로필 사진(아바타)</li>
                    <li>배송 주소</li>
                    <li>마케팅 동의 여부</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold">자동 수집 항목:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>IP 주소</li>
                    <li>쿠키, 로그 정보</li>
                    <li>기기 정보 (OS, 브라우저 유형)</li>
                    <li>방문 기록 및 이용 행태</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900">2. 수집 방법</h3>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>회원 가입 시 직접 입력</li>
                <li>서비스 이용 과정에서 자동 수집</li>
                <li>쿠키를 통한 추적</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제2조 개인정보의 이용 목적</h2>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">Fruit Rescue는 수집한 개인정보를 다음 목적으로만 이용합니다:</p>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li><strong>서비스 제공</strong>: 회원 관리, 예약 처리, 거래 진행</li>
              <li><strong>고객 서비스</strong>: 문의 응답, 고객 지원</li>
              <li><strong>마케팅</strong>: 신제품 안내, 이벤트 공지 (동의 시에만)</li>
              <li><strong>통계 분석</strong>: 서비스 개선, 사용자 행태 분석</li>
              <li><strong>보안</strong>: 부정 이용 방지, 사기 탐지</li>
              <li><strong>법적 의무 준수</strong>: 세법, 소비자 보호법 등</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제3조 개인정보의 보보 및 보유 기간</h2>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">보유 기간</h3>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li><strong>일반 회원정보</strong>: 서비스 이용 기간 + 1년</li>
                <li><strong>거래 기록</strong>: 분쟁 해결 목적으로 3년</li>
                <li><strong>마케팅 정보</strong>: 동의 철회 시까지</li>
              </ul>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900">보관 방법</h3>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>개인정보는 암호화하여 저장합니다.</li>
                <li>접근 권한을 제한합니다.</li>
                <li>물리적, 기술적 보안 조치를 취합니다.</li>
              </ol>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제4조 개인정보의 제3자 제공</h2>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">Fruit Rescue는 다음의 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다:</p>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li>법령에 따른 의무 준수 (법원, 검찰 등)</li>
              <li>회원의 명시적 동의</li>
              <li>서비스 제공을 위해 필요한 최소한의 정보 제공:
                <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                  <li>결제 대행사 (결제 처리 목적)</li>
                  <li>배송 업체 (배송 목적)</li>
                  <li>고객센터 운영사 (고객 지원 목적)</li>
                </ul>
              </li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제5조 개인정보 수정 및 삭제</h2>

            <div className="space-y-3">
              <div>
                <p className="font-semibold text-sm text-gray-900">1. 수정 권리</p>
                <p className="text-sm text-gray-700 mt-1">회원은 언제든지 자신의 개인정보를 수정할 수 있습니다.</p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside pl-2 mt-1">
                  <li>마이페이지에서 직접 수정 가능</li>
                  <li>고객센터에 요청</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="font-semibold text-sm text-gray-900">2. 삭제 권리</p>
                <p className="text-sm text-gray-700 mt-1">회원은 다음의 경우 개인정보 삭제를 요청할 수 있습니다:</p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside pl-2 mt-1">
                  <li>회원 탈퇴 시</li>
                  <li>수집 목적 달성 후</li>
                  <li>동의 철회 시</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="font-semibold text-sm text-gray-900">3. 즉시 삭제되지 않는 정보</p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside pl-2 mt-1">
                  <li>거래 기록 (3년 보관)</li>
                  <li>법적 의무에 따른 정보</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제6조 개인정보 처리 동의</h2>

            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900">마케팅 동의</h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside pl-2 mt-1">
                  <li>회원은 가입 시 마케팅 수신 동의 여부를 선택할 수 있습니다.</li>
                  <li>언제든지 마이페이지에서 동의를 철회할 수 있습니다.</li>
                  <li>동의 철회 후 광고는 발송되지 않습니다.</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900">위치 기반 서비스 동의</h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside pl-2 mt-1">
                  <li>근처 가게 추천 서비스는 위치 동의가 필요합니다.</li>
                  <li>iOS/Android 시스템 설정에서 언제든지 철회 가능합니다.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제7조 쿠키 및 추적 기술</h2>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li>Fruit Rescue는 쿠키를 사용하여 사용자 경험을 개선합니다.</li>
              <li>브라우저 설정에서 쿠키 사용을 거부할 수 있습니다.</li>
              <li>쿠키 거부 시 서비스 일부 기능이 제한될 수 있습니다.</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제8조 개인정보 보호 책임자</h2>
            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-2">
              <p><strong>개인정보 보호담당자</strong></p>
              <p>연락처: support@fruit-rescue.app</p>
              <p className="pt-2"><strong>개인정보 침해 신고</strong></p>
              <p>개인정보 침해 사항은 고객센터로 즉시 신고해주세요.</p>
              <p>모든 신고는 신속하게 처리됩니다.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제9조 아동 개인정보 보호</h2>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li>Fruit Rescue는 14세 미만 아동의 개인정보를 수집하지 않습니다.</li>
              <li>법정대리인의 동의 없이 아동 정보를 수집하면 즉시 삭제합니다.</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제10조 개인정보 처리방침의 변경</h2>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li>본 방침은 법령 변경 또는 서비스 개선에 따라 변경될 수 있습니다.</li>
              <li>변경 시 서비스 내 공지합니다.</li>
              <li>중요한 변경의 경우 이메일로 별도 안내합니다.</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제11조 이용자의 권리</h2>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">회원은 다음의 권리를 가집니다:</p>
            <ol className="text-sm text-gray-700 leading-relaxed space-y-2 list-decimal list-inside">
              <li><strong>열람권</strong>: 자신의 개인정보 열람 요청</li>
              <li><strong>정정권</strong>: 부정확한 정보 수정 요청</li>
              <li><strong>삭제권</strong>: 개인정보 삭제 요청</li>
              <li><strong>처리 제한권</strong>: 개인정보 처리 제한 요청</li>
              <li><strong>이전권</strong>: 개인정보 이전 요청</li>
            </ol>
            <p className="text-sm text-gray-700 leading-relaxed pt-3">권리 행사는 support@fruit-rescue.app으로 문의하세요.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">제12조 법적 근거</h2>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">본 방침은 다음 법령에 따릅니다:</p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>「개인정보보호법」</li>
              <li>「정보통신망 이용촉진 및 정보보호 등에 관한 법률」</li>
              <li>「전자상거래 등에서의 소비자보호에 관한 법률」</li>
            </ul>
          </section>

          <div className="pt-6 border-t border-gray-200 space-y-2">
            <p className="text-xs text-gray-500">
              <strong>문의:</strong> support@fruit-rescue.app
            </p>
            <p className="text-xs text-gray-500">
              마지막 수정: 2026년 5월 12일
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

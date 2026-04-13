'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/utils/supabase';
import { calculateDistance, formatPrice } from '@/utils/helpers';

// 타입 정의
type FilterType = 'distance' | 'urgency' | 'discount';

interface RescueProduct {
  id: string;
  product_name: string;
  rescue_price: number;
  original_price: number;
  discount_rate: number;
  stock_quantity: number;
  expire_datetime: string;
  expire_warning_minutes: number;
  image_url: string;
  description?: string;
  shop: {
    id: string;
    shop_name: string;
    latitude: number;
    longitude: number;
    address: string;
    phone: string;
    logo_image_url?: string;
  };
  distance?: number;
  ai_briefing?: Array<{
    briefing_text: string;
    urgency_level: string;
  }>;
}

interface DailyStats {
  total_rescued_items: number;
  unique_rescuers: number;
}

export default function MapPage() {
  // 🗺️ 지도 관련
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<any[]>([]);

  // 📍 위치 및 필터
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [rescueProducts, setRescueProducts] = useState<RescueProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<RescueProduct | null>(null);
  const [radius, setRadius] = useState(3);
  const [filter, setFilter] = useState<FilterType>('distance');
  const [category, setCategory] = useState('');

  // 📊 통계
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    total_rescued_items: 0,
    unique_rescuers: 0,
  });

  // 🎮 UI 상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rescuerNickname, setRescuerNickname] = useState('');

  const categories = ['과일', '축산', '야채', '수산', '공산품'];

  // 1️⃣ 구조대원 세션 초기화
  useEffect(() => {
    const initRescuer = async () => {
      let sessionToken = localStorage.getItem('rescuer_session');

      if (!sessionToken) {
        const randomNickname = `구조대원${Math.floor(Math.random() * 10000)}`;
        sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
          await supabase.from('rescuers').insert([
            {
              nickname: randomNickname,
              session_token: sessionToken,
            },
          ]);
        } catch (err) {
          console.error('구조대원 등록 오류:', err);
        }

        localStorage.setItem('rescuer_session', sessionToken);
        localStorage.setItem('rescuer_nickname', randomNickname);
      }

      setRescuerNickname(localStorage.getItem('rescuer_nickname') || '구조대원');
    };

    initRescuer();
  }, []);

  // 2️⃣ 사용자 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setUserLocation({ lat: 37.4979, lng: 127.0276 });
        }
      );
    }
  }, []);

  // 3️⃣ Kakao Maps 초기화
  useEffect(() => {
    if (!userLocation || !mapContainer.current) return;

    if (!window.kakao?.maps) {
      setError('지도를 불러올 수 없습니다');
      return;
    }

    const { kakao } = window;

    const mapOption = {
      center: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      level: 4,
    };

    const newMap = new kakao.maps.Map(mapContainer.current, mapOption);
    map.current = newMap;

    // 나의 위치 마커
    const userMarker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      title: `${rescuerNickname} (내 위치)`,
      image: new kakao.maps.MarkerImage(
        'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/bluedot.png',
        new kakao.maps.Size(36, 36),
        { offset: new kakao.maps.Point(18, 18) }
      ),
    });
    userMarker.setMap(newMap);

    setLoading(false);
  }, [userLocation, rescuerNickname]);

  // 4️⃣ 구조 대상 상품 조회
  useEffect(() => {
    if (!userLocation) return;

    const fetchRescueProducts = async () => {
      try {
        setLoading(true);

        let query = supabase
          .from('rescue_products')
          .select('*, shops(*), ai_briefings(*)')
          .eq('status', 'active')
          .eq('is_rescued', false);

        if (category) {
          query = query.eq('category', category);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const productsWithDistance = (data || [])
          .map((product) => ({
            ...product,
            distance: calculateDistance(
              userLocation.lat,
              userLocation.lng,
              product.shops.latitude,
              product.shops.longitude
            ),
          }))
          .filter((p) => p.distance <= radius);

        // 정렬
        let sorted = productsWithDistance;
        if (filter === 'urgency') {
          sorted = productsWithDistance.sort((a, b) => {
            const aTime = new Date(a.expire_datetime).getTime();
            const bTime = new Date(b.expire_datetime).getTime();
            return aTime - bTime;
          });
        } else if (filter === 'discount') {
          sorted = productsWithDistance.sort((a, b) => b.discount_rate - a.discount_rate);
        } else {
          sorted = productsWithDistance.sort((a, b) => a.distance! - b.distance!);
        }

        setRescueProducts(sorted);
        displayMarkers(sorted);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRescueProducts();
  }, [userLocation, radius, category, filter]);

  // 5️⃣ 일일 통계 조회
  useEffect(() => {
    const fetchDailyStats = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('daily_stats')
          .select('total_rescued_items, unique_rescuers')
          .eq('date', today)
          .single();

        if (data) {
          setDailyStats(data);
        }
      } catch (err) {
        console.error('통계 로드 오류:', err);
      }
    };

    fetchDailyStats();
    const interval = setInterval(fetchDailyStats, 10000);

    return () => clearInterval(interval);
  }, []);

  // 6️⃣ 지도에 마커 표시
  const displayMarkers = (products: RescueProduct[]) => {
    if (!map.current || !window.kakao?.maps) return;

    markers.current.forEach((marker) => marker.setMap(null));
    markers.current = [];

    const { kakao } = window;

    products.forEach((product) => {
      const isUrgent =
        product.discount_rate > 50 ||
        (product.expire_warning_minutes && product.expire_warning_minutes < 60);

      const markerContent = isUrgent ? '🚨' : '🆘';

      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(product.shop.latitude, product.shop.longitude),
        title: product.product_name,
      });

      const markerImage = new kakao.maps.MarkerImage(
        `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="40" dominant-baseline="middle">${markerContent}</text></svg>`,
        new kakao.maps.Size(40, 40),
        { offset: new kakao.maps.Point(20, 20) }
      );

      marker.setImage(markerImage);
      marker.setMap(map.current);
      markers.current.push(marker);

      kakao.maps.event.addListener(marker, 'click', () => {
        selectProduct(product);
      });
    });
  };

  // 7️⃣ 상품 선택
  const selectProduct = async (product: RescueProduct) => {
    setSelectedProduct(product);

    await supabase.from('analytics').insert([
      {
        shop_id: product.shop.id,
        rescuer_id: null,
        event_type: 'click',
        product_id: product.id,
      },
    ]);

    if (map.current && window.kakao?.maps) {
      map.current.setCenter(
        new window.kakao.maps.LatLng(product.shop.latitude, product.shop.longitude)
      );
      map.current.setLevel(3);
    }
  };

  // 8️⃣ 구조 완료
  const handleRescueComplete = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('rescue_products')
        .update({
          is_rescued: true,
          status: 'rescued',
          rescued_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (error) throw error;

      await supabase.from('analytics').insert([
        {
          shop_id: selectedProduct?.shop.id,
          rescuer_id: null,
          event_type: 'rescue',
          product_id: productId,
        },
      ]);

      alert('🎉 구조 성공! 이 상품을 구출하셨습니다!');
      setSelectedProduct(null);

      const { data } = await supabase
        .from('rescue_products')
        .select('*, shops(*), ai_briefings(*)')
        .eq('status', 'active')
        .eq('is_rescued', false);

      const withDistance = (data || []).map((p) => ({
        ...p,
        distance: calculateDistance(
          userLocation!.lat,
          userLocation!.lng,
          p.shops.latitude,
          p.shops.longitude
        ),
      }));

      setRescueProducts(withDistance);
    } catch (err: any) {
      alert('구조 완료 처리 중 오류가 발생했습니다');
    }
  };

  // 9️⃣ 전화 걸기
  const handleCallRescue = async (phone: string, shopId: string) => {
    window.location.href = `tel:${phone}`;

    await supabase.from('analytics').insert([
      {
        shop_id: shopId,
        rescuer_id: null,
        event_type: 'contact',
        product_id: selectedProduct?.id,
      },
    ]);
  };

  // 시간 계산
  const getTimeUntilExpire = (expireTime: string, minutes: number): string => {
    const expire = new Date(expireTime);
    const now = new Date();
    const diff = expire.getTime() - now.getTime();
    const remainMinutes = Math.floor(diff / 60000);

    if (remainMinutes < 0) return '⏰ 폐기됨!';
    if (remainMinutes < 60) return `⏰ ${remainMinutes}분 남음!`;
    return `⏰ ${Math.floor(remainMinutes / 60)}시간 남음`;
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-red-50 to-white">
      {/* 🚨 헤더 */}
      <header className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 shadow-2xl border-b-4 border-red-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black flex items-center gap-2">
              🚨 과일구조대 <span className="text-sm font-normal text-red-200">RESCUE OPERATION</span>
            </h1>
            <p className="text-red-100 text-sm mt-1">
              구조대원 <span className="font-bold text-yellow-300">{rescuerNickname}</span>, 당신은 우리 동네를 지키는 영웅입니다!
            </p>
          </div>

          {/* 📊 실시간 구조 전광판 */}
          <div className="bg-black bg-opacity-50 px-6 py-3 rounded-lg border-2 border-yellow-300 text-center">
            <p className="text-yellow-300 font-black text-sm mb-1">오늘의 구조 현황</p>
            <p className="text-2xl font-black text-yellow-300 animate-pulse">
              {dailyStats.total_rescued_items}개 상품 구조됨!
            </p>
            <p className="text-yellow-200 text-xs mt-1">
              {dailyStats.unique_rescuers}명의 구조대원이 활동 중
            </p>
          </div>
        </div>
      </header>

      {/* 🎯 미션 컨트롤 - 필터 */}
      <div className="bg-white border-b-2 border-red-200 p-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* 반경 선택 */}
            <div>
              <label className="block text-xs font-bold text-red-600 mb-1 uppercase">
                📍 작전 반경
              </label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={radius}
                onChange={(e) => setRadius(parseFloat(e.target.value))}
                className="w-full h-2 bg-red-200 rounded-lg"
              />
              <p className="text-xs text-gray-600 text-center mt-1">{radius}km</p>
            </div>

            {/* 카테고리 필터 */}
            <div>
              <label className="block text-xs font-bold text-red-600 mb-1 uppercase">
                🏷️ 상품 카테고리
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border-2 border-red-200 rounded px-2 py-1 text-sm focus:border-red-500"
              >
                <option value="">전체 상품</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* 정렬 옵션 */}
            <div>
              <label className="block text-xs font-bold text-red-600 mb-1 uppercase">
                📊 정렬 기준
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="w-full border-2 border-red-200 rounded px-2 py-1 text-sm focus:border-red-500"
              >
                <option value="distance">최단 거리 (급한 순)</option>
                <option value="urgency">유통기한 임박</option>
                <option value="discount">할인율 높은순</option>
              </select>
            </div>

            {/* 상품 카운팅 */}
            <div className="flex items-end">
              <div className="text-center w-full">
                <p className="text-2xl font-black text-red-600">{rescueProducts.length}</p>
                <p className="text-xs text-gray-600">구조 대상 발견</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🗺️ 메인 컨텐츠 */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* 지도 */}
        <div className="flex-1 relative">
          <div
            ref={mapContainer}
            className="w-full h-full rounded-lg shadow-xl border-4 border-red-300"
          />

          {loading && (
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-lg">
              <div className="bg-white rounded-lg p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mx-auto mb-3"></div>
                <p className="text-red-600 font-bold">구조 임무 준비 중...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* 사이드 패널 */}
        <div className="w-full md:w-96 bg-white rounded-lg shadow-xl border-4 border-red-300 overflow-hidden flex flex-col">
          {selectedProduct ? (
            <>
              {/* 헤더 */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 border-b-4 border-red-700">
                <h2 className="text-2xl font-black mb-2">🆘 구조 대상</h2>
                <p className="text-sm text-red-100">긴급 구조가 필요한 상품입니다!</p>
              </div>

              {/* 콘텐츠 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 이미지 */}
                {selectedProduct.image_url && (
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.product_name}
                    className="w-full h-48 object-cover rounded-lg border-2 border-red-300"
                  />
                )}

                {/* 상품명 */}
                <div className="bg-yellow-50 p-3 rounded-lg border-2 border-yellow-300">
                  <p className="text-xs text-yellow-700 font-bold mb-1">상품명</p>
                  <h3 className="text-xl font-black text-gray-900">{selectedProduct.product_name}</h3>
                  <p className="text-sm text-red-600 font-bold mt-2">📍 {selectedProduct.shop.shop_name}</p>
                  <p className="text-xs text-gray-600">{selectedProduct.shop.address}</p>
                </div>

                {/* 가격 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-100 p-3 rounded-lg border-2 border-gray-300">
                    <p className="text-xs text-gray-600 font-bold mb-1">정상가</p>
                    <p className="text-lg font-black text-gray-900 line-through">
                      {selectedProduct.original_price.toLocaleString()}원
                    </p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg border-2 border-red-400">
                    <p className="text-xs text-red-600 font-bold mb-1">구조가</p>
                    <p className="text-2xl font-black text-red-600">
                      {selectedProduct.rescue_price.toLocaleString()}원
                    </p>
                  </div>
                </div>

                {/* 할인율 */}
                <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-3 rounded-lg text-center border-2 border-orange-700 animate-pulse">
                  <p className="text-4xl font-black">{selectedProduct.discount_rate}%</p>
                  <p className="text-sm font-bold">할인 중!</p>
                </div>

                {/* 재고 & 시간 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg border-2 border-blue-300">
                    <p className="text-xs text-blue-600 font-bold mb-1">남은 재고</p>
                    <p className="text-2xl font-black text-blue-600">{selectedProduct.stock_quantity}</p>
                    <p className="text-xs text-blue-600">개</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg border-2 border-orange-300">
                    <p className="text-xs text-orange-600 font-bold mb-1">마감 시간</p>
                    <p className="text-xs font-black text-orange-600">
                      {getTimeUntilExpire(
                        selectedProduct.expire_datetime,
                        selectedProduct.expire_warning_minutes || 0
                      )}
                    </p>
                  </div>
                </div>

                {/* AI 브리핑 */}
                {selectedProduct.ai_briefing && selectedProduct.ai_briefing.length > 0 && (
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-3 rounded-lg border-2 border-purple-400">
                    <p className="text-xs text-purple-600 font-bold mb-1">🤖 AI 긴급 브리핑</p>
                    <p className="text-sm font-black text-purple-900">
                      {selectedProduct.ai_briefing[0].briefing_text}
                    </p>
                  </div>
                )}

                {/* 설명 */}
                {selectedProduct.description && (
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 font-bold mb-1">상품 설명</p>
                    <p className="text-sm text-gray-800">{selectedProduct.description}</p>
                  </div>
                )}

                {/* 거리 */}
                {selectedProduct.distance && (
                  <div className="bg-green-50 p-3 rounded-lg border-2 border-green-400">
                    <p className="text-2xl font-black text-green-600 text-center">
                      📍 {selectedProduct.distance.toFixed(2)}km
                    </p>
                    <p className="text-xs text-green-600 text-center font-bold">작전 거리</p>
                  </div>
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="border-t-4 border-red-300 p-4 space-y-2 bg-gray-50">
                <button
                  onClick={() => handleCallRescue(selectedProduct.shop.phone, selectedProduct.shop.id)}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black py-3 rounded-lg transition transform hover:scale-105 text-lg flex items-center justify-center gap-2 border-2 border-green-700"
                >
                  📞 사장님께 전화하기
                </button>

                <button
                  onClick={() => handleRescueComplete(selectedProduct.id)}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-black py-3 rounded-lg transition transform hover:scale-105 text-lg flex items-center justify-center gap-2 border-2 border-red-700"
                >
                  ✅ 구조 완료 처리
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 flex-col">
              <p className="text-6xl mb-4">🗺️</p>
              <p className="text-lg font-bold text-center">지도에서 구조 대상을 선택하세요!</p>
              <p className="text-sm text-gray-400 mt-2">🚨 반짝거리는 마커들이 긴급한 상품입니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    kakao: any;
  }
}

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  timeLeft: number;
  shop: string;
  distance: number;
  lat: number;
  lng: number;
}

const DUMMY_PRODUCTS: Product[] = [
  { id: "1", name: "딸기 한박스", price: 5000, originalPrice: 15000, discount: 67, timeLeft: 3, shop: "김씨 과일가게", distance: 0.5, lat: 37.5665, lng: 126.978 },
  { id: "2", name: "포도 2kg", price: 8000, originalPrice: 25000, discount: 68, timeLeft: 2, shop: "이마트 지점", distance: 1.2, lat: 37.57, lng: 126.985 },
  { id: "3", name: "귤 5kg", price: 12000, originalPrice: 30000, discount: 60, timeLeft: 4, shop: "농산물 직판장", distance: 2.1, lat: 37.575, lng: 126.97 },
  { id: "4", name: "수박", price: 15000, originalPrice: 45000, discount: 67, timeLeft: 1, shop: "롯데마트", distance: 3.0, lat: 37.56, lng: 126.99 },
  { id: "5", name: "토마토", price: 3000, originalPrice: 8000, discount: 63, timeLeft: 5, shop: "편의점", distance: 0.3, lat: 37.568, lng: 126.975 },
];

export default function MapPage() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [filterType, setFilterType] = useState<"distance" | "urgency" | "discount">("distance");
  const [products, setProducts] = useState<Product[]>(DUMMY_PRODUCTS);

  // Kakao Maps 로드
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey=60447eaeac577e6c07c6cb475eeb65e4&libraries=services";
    script.async = true;
    script.onload = () => {
      setMapLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // 지도 초기화 & 마커 표시
  useEffect(() => {
    if (!mapLoaded || !window.kakao?.maps) return;

    const mapContainer = document.getElementById("map");
    if (!mapContainer) return;

    const map = new window.kakao.maps.Map(mapContainer, {
      center: new window.kakao.maps.LatLng(37.5665, 126.978),
      level: 4,
    });

    // 마커 추가
    products.forEach((product) => {
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(product.lat, product.lng),
        map: map,
        title: product.name,
      });

      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding: 8px; font-size: 12px;"><strong>${product.name}</strong><br/>${product.price.toLocaleString()}원</div>`,
      });

      marker.addListener("mouseover", () => infowindow.open(map, marker));
      marker.addListener("mouseout", () => infowindow.close());
    });
  }, [mapLoaded, products]);

  const sortedProducts = [...products].sort((a, b) => {
    if (filterType === "distance") return a.distance - b.distance;
    if (filterType === "urgency") return a.timeLeft - b.timeLeft;
    return b.discount - a.discount;
  });

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 위 바 (헤더) */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-5 py-4 flex items-center justify-between flex-shrink-0 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚨</span>
          <h1 className="text-xl font-bold">과일구조대</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button className="hover:bg-red-600 px-3 py-1 rounded">📍 위치</button>
          <button className="hover:bg-red-600 px-3 py-1 rounded">⚙️</button>
        </div>
      </div>

      {/* 지도 (100% 차지) */}
      <div className="flex-1 relative overflow-hidden">
        <div id="map" className="w-full h-full" />
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <div className="text-white text-center">
              <div className="text-4xl mb-2">🗺️</div>
              <p>지도 로딩 중...</p>
            </div>
          </div>
        )}
      </div>

      {/* 아래 바 (상품 정보 & 액션) */}
      <div className="bg-white border-t border-gray-300 flex-shrink-0 max-h-96 overflow-y-auto shadow-2xl">
        {/* 필터 */}
        <div className="sticky top-0 bg-white border-b p-4 flex gap-2">
          <button
            onClick={() => setFilterType("distance")}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              filterType === "distance" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            📍 거리순
          </button>
          <button
            onClick={() => setFilterType("urgency")}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              filterType === "urgency" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            ⏰ 마감순
          </button>
          <button
            onClick={() => setFilterType("discount")}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              filterType === "discount" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            💰 할인순
          </button>
        </div>

        {/* 실시간 통계 */}
        <div className="bg-orange-50 border-b border-orange-200 p-4">
          <p className="text-sm text-gray-600">🚨 오늘 우리 동네에서</p>
          <p className="text-lg font-bold text-orange-600">{products.length * 4}개 상품이 구조됨!</p>
        </div>

        {/* 상품 목록 */}
        <div className="space-y-2 p-3">
          {sortedProducts.map((product) => (
            <div key={product.id} className="bg-gradient-to-r from-pink-50 to-white border-2 border-pink-200 rounded-lg p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-900">{product.name}</h3>
                  <p className="text-xs text-gray-600">{product.shop}</p>
                </div>
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">{product.discount}%</span>
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-lg font-bold text-red-600">{product.price.toLocaleString()}원</span>
                <span className="text-xs line-through text-gray-400">{product.originalPrice.toLocaleString()}원</span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-orange-600 font-semibold">⏳ {product.timeLeft}시간 내</span>
                <span className="text-xs text-gray-500">📍 {product.distance}km</span>
              </div>

              <button className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 rounded-lg transition">
                📞 전화하기
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

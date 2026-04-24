"use client";

import Link from 'next/link'
import { useEffect, useState, useRef } from "react";
import { MapPin, Clock, Percent, Phone, Navigation, Settings, AlertTriangle, RefreshCw, LogIn, X } from "lucide-react";
import AuthModal from "@/components/auth/AuthModal";
import { useAuth } from '@/lib/auth-context'
import { supabase } from "@/lib/supabase";

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
  shopId: string;
  category: string;
  description?: string;
  shopPhone?: string;
  shopImage?: string;
  shopDescription?: string;
  stock?: number;
}

interface Shop {
  id: string;
  shop_name: string;
  category: string;
  latitude: number;
  longitude: number;
  phone?: string;
  address?: string;
  shop_image_url?: string;
  description?: string;
}

interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  active: boolean;
  is_active: boolean;
  sort_order: number;
}

const DUMMY_PRODUCTS: Product[] = [
  {
    id: 'dummy-1',
    name: '신선한 과일 한 상자',
    price: 9800,
    originalPrice: 15000,
    discount: 35,
    timeLeft: 4,
    shop: '신선 마트',
    distance: 0.8,
    category: '과일',
    lat: 37.5665,
    lng: 126.978,
    shopId: 'shop-1',
  },
  {
    id: 'dummy-2',
    name: '즉석 샐러드 팩',
    price: 5500,
    originalPrice: 9000,
    discount: 39,
    timeLeft: 2,
    shop: '강남 채소시장',
    distance: 1.2,
    category: '야채',
    lat: 37.5655,
    lng: 126.976,
    shopId: 'shop-2',
  },
]

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  과일: '🍎',
  야채: '🥕',
  축산: '🥩',
  수산: '🐟',
  공산품: '📦',
  베이커리: '🥐',
  기타: '🛍️',
};

export default function MapPage() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'join'>('login');
  const [authInitialRole, setAuthInitialRole] = useState<'user' | 'seller'>('user');
  const [map, setMap] = useState<any>(null);
  const { user, profile, signOut } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerIdx, setBannerIdx] = useState([0, 0]); // [slot1 index, slot2 index]
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const userMarkerRef = useRef<any>(null);
  const [selectedPin, setSelectedPin] = useState<'white' | 'yellow' | 'blue' | 'green'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('fr_pin') as any) || 'yellow';
    }
    return 'yellow';
  });
  const [showPinSelector, setShowPinSelector] = useState(false);

  // Supabase에서 실제 데이터 로드
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 먼저 간단한 상품 데이터 로드
      const { data: productData, error: productError } = await supabase
        .from('rescue_products')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (productError) {
        console.error('Product load error:', productError);
        // 에러 발생 시 로컬 더미 데이터를 사용합니다.
        console.log('Using dummy data due to API error');
        setProducts(DUMMY_PRODUCTS);
        return;
      }

      console.log('Product data loaded:', productData);

      // 상점 데이터 로드
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('is_active', true)
        .limit(10);

      if (shopError) {
        console.error('Shop load error:', shopError);
        return;
      }

      console.log('Shop data loaded:', shopData);
      const shopMap = new Map((shopData ?? []).map((shop: any) => [shop.id, shop]));

      if (productData && productData.length > 0) {
        const formattedProducts: Product[] = productData.map((item: any) => {
          const shop = shopMap.get(item.shop_id);
          const expireTime = item.expire_datetime ? new Date(item.expire_datetime).getTime() : null;
          const hoursLeft = expireTime ? Math.max(0, Math.ceil((expireTime - Date.now()) / (1000 * 60 * 60))) : 0;

          return {
            id: item.id,
            name: item.product_name,
            price: item.rescue_price,
            originalPrice: item.original_price,
            discount: Math.round(((item.original_price - item.rescue_price) / item.original_price) * 100),
            timeLeft: hoursLeft,
            shop: item.shop_name || shop?.shop_name || '알 수 없음',
            shopId: item.shop_id,
            category: item.category || shop?.category || '기타',
            description: item.description || shop?.description || '',
            stock: item.stock_quantity ?? item.stock ?? 0,
            shopPhone: shop?.phone ?? item.phone,
            shopImage: shop?.shop_image_url,
            shopDescription: shop?.description || item.description || '',
            distance: 1.0,
            lat: shop?.latitude ?? 37.5665,
            lng: shop?.longitude ?? 126.978,
          }
        });
        setProducts(formattedProducts);
      }

      if (shopData && shopData.length > 0) {
        setShops(shopData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 배너 데이터 로드 함수
  const loadBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) console.error('배너 로드 실패:', error);
      else if (data) setBanners(data);
    } catch (error) {
      console.error('배너 로드 중 오류:', error);
    }
  };

  // 윈도우 리사이즈 이벤트 처리
  useEffect(() => {
    const handleResize = () => {
      if (mapLoaded && window.kakao?.maps) {
        // 지도 컨테이너가 있으면 relayout
        setTimeout(() => {
          console.log("Window resized, triggering map relayout");
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mapLoaded]);

  // Kakao Maps 스크립트 동적 로드
  useEffect(() => {
    // 이미 로드되어 있다면 스킵
    if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
      setMapLoaded(true);
      return;
    }

    // 기존 스크립트 제거
    const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=services&autoload=false`;
    script.async = true;

    script.onload = () => {
      console.log("Kakao Maps script loaded, initializing with kakao.maps.load()...");
      // 수동 로드를 통해 완전한 초기화 보장
      if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
        window.kakao.maps.load(() => {
          console.log("✓ Kakao Maps fully loaded in callback");
          
          // 완전한 API 준비 확인 (재시도 로직)
          let retries = 0;
          const checkAndSetReady = () => {
            console.log(`Checking API readiness... attempt ${retries + 1}`, {
              LatLng: !!window.kakao.maps.LatLng,
              Map: !!window.kakao.maps.Map,
              Marker: !!window.kakao.maps.Marker
            });

            if (window.kakao.maps.LatLng && window.kakao.maps.Map && window.kakao.maps.Marker) {
              console.log("✓✓✓ All Kakao Maps classes ready!");
              setMapLoaded(true);
            } else if (retries < 5) {
              retries++;
              setTimeout(checkAndSetReady, 200);
            } else {
              console.warn("Failed to fully load Kakao Maps after retries, setting mapLoaded anyway");
              setMapLoaded(true);
            }
          };

          checkAndSetReady();
        });
      } else {
        console.error("Kakao Maps or load function not available");
      }
    };

    script.onerror = (e) => {
      console.error("✗ Failed to load Kakao Maps script", e);
    };

    document.head.appendChild(script);

    return () => {
      // cleanup
      const scriptToRemove = document.querySelector('script[src*="dapi.kakao.com"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, []);

  useEffect(() => {
    loadData();
    loadBanners();
  }, []);

  // 배너 자동 슬라이드 (슬롯1: 즉시, 슬롯2: 0.5초 오프셋)
  useEffect(() => {
    const slot1 = banners.filter(b => b.sort_order === 1);
    const slot2 = banners.filter(b => b.sort_order === 2);
    if (slot1.length <= 1 && slot2.length <= 1) return;

    let t1: ReturnType<typeof setInterval> | null = null;
    let t2: ReturnType<typeof setInterval> | null = null;
    let offset: ReturnType<typeof setTimeout> | null = null;

    if (slot1.length > 1) {
      t1 = setInterval(() => {
        setBannerIdx(prev => [(prev[0] + 1) % slot1.length, prev[1]]);
      }, 3000);
    }
    if (slot2.length > 1) {
      offset = setTimeout(() => {
        t2 = setInterval(() => {
          setBannerIdx(prev => [prev[0], (prev[1] + 1) % slot2.length]);
        }, 3000);
      }, 500);
    }
    return () => {
      if (t1) clearInterval(t1);
      if (t2) clearInterval(t2);
      if (offset) clearTimeout(offset);
    };
  }, [banners]);

  // 마커 업데이트 함수
  const updateMarkers = (targetMap?: any) => {
    const currentMap = targetMap || map;
    if (!currentMap || !window.kakao?.maps?.event) return;

    console.log("Updating markers...");

    // 기존 마커들 제거 (선택사항)
    // currentMap에 있는 모든 오버레이 제거 로직 추가 가능

    // 상품 마커 추가
    products.forEach((product) => {
      if (product.lat && product.lng) {
        try {
          const markerPosition = new window.kakao.maps.LatLng(product.lat, product.lng);
          const marker = new window.kakao.maps.Marker({
            position: markerPosition,
            map: currentMap,
            title: product.name,
          });

          // 마커 클릭 이벤트
          window.kakao.maps.event.addListener(marker, 'click', () => {
            console.log('Marker clicked:', product.name);
            setSelectedProduct(product);
          });
        } catch (error) {
          console.error("Error creating product marker:", error);
        }
      }
    });

    // 상점 마커 추가 (카테고리별 아이콘)
    shops.forEach((shop) => {
      if (shop.latitude && shop.longitude) {
        try {
          const categoryLabel = shop.category || '기타';
          const iconEmoji = CATEGORY_EMOJI_MAP[categoryLabel] ?? '🛍️';
          const svg = `
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#FF6B35" stroke="white" stroke-width="3" />
              <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="22">${iconEmoji}</text>
            </svg>
          `;
          const markerPosition = new window.kakao.maps.LatLng(shop.latitude, shop.longitude);
          const marker = new window.kakao.maps.Marker({
            position: markerPosition,
            map: currentMap,
            title: shop.shop_name,
            image: new window.kakao.maps.MarkerImage(
              'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svg))),
              new window.kakao.maps.Size(40, 40)
            )
          });

          window.kakao.maps.event.addListener(marker, 'click', () => {
            setSelectedShop(shop);
          });
        } catch (error) {
          console.error("Error creating shop marker:", error);
        }
      }
    });
  };

  // 지도 초기화 및 마커 표시
  useEffect(() => {
    if (!mapLoaded || !window.kakao?.maps?.LatLng || !window.kakao?.maps?.Map || !window.kakao?.maps?.Marker) {
      console.log("Waiting for Kakao Maps API...", {
        mapLoaded,
        kakao: !!window.kakao,
        maps: !!window.kakao?.maps,
        LatLng: !!window.kakao?.maps?.LatLng,
        Map: !!window.kakao?.maps?.Map,
        Marker: !!window.kakao?.maps?.Marker
      });
      return;
    }

    const mapContainer = document.getElementById("map");
    if (!mapContainer) {
      console.error("Map container not found");
      return;
    }

    console.log("Map container found. Dimensions:", mapContainer.offsetWidth, "x", mapContainer.offsetHeight);

    try {
      console.log("Initializing new map...");
      const savedLoc = (() => {
        try { return JSON.parse(localStorage.getItem('fr_location') || 'null'); } catch { return null; }
      })();
      const initLat = savedLoc?.lat ?? 37.5665;
      const initLng = savedLoc?.lng ?? 126.978;
      const mapOption = {
        center: new window.kakao.maps.LatLng(initLat, initLng),
        level: 4,
        draggable: true,
        zoomable: true,
        scrollwheel: true,
        disableDoubleClick: false,
        disableDoubleClickZoom: false,
      };

      console.log("Map options created");
      const newMap = new window.kakao.maps.Map(mapContainer, mapOption);
      console.log("✓ Map object created");
      setMap(newMap);

      // 저장된 위치가 있으면 핀 복원
      if (savedLoc) {
        const savedPin = (localStorage.getItem('fr_pin') as any) || 'yellow';
        const pinUrl = window.location.origin + `/pin-${savedPin}.svg`;
        const markerImage = new window.kakao.maps.MarkerImage(
          pinUrl,
          new window.kakao.maps.Size(50, 55),
          { offset: new window.kakao.maps.Point(25, 27) }
        );
        const restoredMarker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(savedLoc.lat, savedLoc.lng),
          map: newMap,
          image: markerImage,
          title: '내 위치',
          zIndex: 10,
        });
        userMarkerRef.current = restoredMarker;
      }
      console.log("✓ Map initialized successfully");

      // 지도 인터랙션 명시적 활성화
      newMap.setDraggable(true);
      newMap.setZoomable(true);



      // 지도 이벤트 리스너 추가 (디버깅용)
      console.log("Adding event listeners...");
      window.kakao.maps.event.addListener(newMap, 'dragend', () => {
        console.log('🖱️ Map dragged');
      });

      window.kakao.maps.event.addListener(newMap, 'zoom_changed', () => {
        console.log('🔍 Map zoomed');
      });

      window.kakao.maps.event.addListener(newMap, 'click', (mouseEvent: any) => {
        console.log('👆 Map clicked at:', mouseEvent.latLng);
      });

      window.kakao.maps.event.addListener(newMap, 'dragstart', () => {
        console.log('🖱️ Map drag started');
      });

      console.log("Event listeners added successfully");

      // 지도 크기 조정 및 초기화
      setTimeout(() => {
        console.log("Setting map container size...");
        mapContainer.style.width = '100%';
        mapContainer.style.height = '100%';
        console.log("Map container size set to:", mapContainer.offsetWidth, "x", mapContainer.offsetHeight);

        newMap.relayout();
        console.log("✓ Map relayout completed");

        // 마커 업데이트
        updateMarkers(newMap);
        console.log("✓ Markers updated");
      }, 1000);

    } catch (error) {
      console.error("Map initialization error:", error);
    }
  }, [mapLoaded]);

  // 마커 업데이트 (데이터 변경시)
  useEffect(() => {
    if (map && mapLoaded) {
      updateMarkers(map);
    }
  }, [map, products, shops, mapLoaded]);

  const handleLogin = (role: 'user' | 'seller' = 'user') => {
    console.log('Login button clicked:', role);
    setAuthInitialRole(role);
    setAuthInitialTab('login');
    setShowAuthModal(true);
  };

  const handleJoin = (role: 'user' | 'seller' = 'user') => {
    console.log('Join button clicked:', role);
    setAuthInitialRole(role);
    setAuthInitialTab('join');
    setShowAuthModal(true);
  };

  return (
    <div className="flex flex-col bg-slate-50 overflow-hidden" style={{ height: '100dvh' }}>
      {/* 위 바 (헤더) */}
      <div className="bg-[#1A3472] text-white px-3 py-0 sm:px-6 flex flex-row items-center justify-between gap-2 flex-shrink-0 shadow-lg relative z-10" style={{ height: '64px' }}>
        <Link href="/" className="flex items-center cursor-pointer overflow-hidden shrink-0"
          style={{ width: 160, height: 64 }}>
          <img src="/logo.png" alt="신선구조대"
            style={{ width: 160, height: 160, objectFit: 'contain',
              transform: 'scale(1.45)', transformOrigin: 'center center' }} />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {profile ? (
            <>
              <div className="flex flex-col items-end text-right text-white/90 leading-tight">
                <span className="font-black text-sm">
                  {profile.nickname ? `${profile.nickname}님` : '대원님'}
                </span>
                <span className="text-[10px] opacity-75">
                  {profile.role === 'seller'
                    ? profile.seller_status === 'approved' ? '사장님' : '승인대기'
                    : '구조중'}
                </span>
              </div>
              {profile.role === 'seller' && profile.seller_status === 'approved' && (
                <Link
                  href="/seller/dashboard"
                  className="flex items-center gap-1 bg-white/15 hover:bg-white/25 border border-white/20 px-2.5 py-1.5 rounded-xl transition-colors text-xs font-semibold"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">대시보드</span>
                </Link>
              )}
              <button
                onClick={signOut}
                className="flex items-center gap-1 bg-white/15 hover:bg-white/25 border border-white/20 px-2.5 py-1.5 rounded-xl transition-colors text-xs font-semibold"
              >
                <LogIn className="w-3.5 h-3.5 rotate-180" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </>
          ) : (
            <>
              {/* 고객 로그인 — 반투명 */}
              <button
                onClick={() => handleLogin('user')}
                className="flex items-center gap-1 bg-white/15 hover:bg-white/25 border border-white/25 px-2.5 py-1.5 rounded-xl transition-colors text-xs font-semibold"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">고객</span>
              </button>
              {/* 사장님 로그인 — 고대비 흰색 버튼으로 차별화 */}
              <button
                onClick={() => handleLogin('seller')}
                className="flex items-center gap-1 bg-white text-[#1A3472] hover:bg-white/90 px-2.5 py-1.5 rounded-xl transition-colors text-xs font-black shadow-md"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">사장님</span>
              </button>
            </>
          )}
          {/* 내 위치 */}
          <div className="relative flex items-center gap-1">
            <button
              onClick={() => {
                if (!navigator.geolocation) {
                  alert('이 브라우저는 위치 서비스를 지원하지 않습니다.');
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ lat: latitude, lng: longitude });
                    localStorage.setItem('fr_location', JSON.stringify({ lat: latitude, lng: longitude }));
                    localStorage.setItem('fr_pin', selectedPin);
                    if (!map) return;

                    const moveLatLng = new window.kakao.maps.LatLng(latitude, longitude);
                    map.setCenter(moveLatLng);
                    map.setLevel(4);

                    if (userMarkerRef.current) {
                      userMarkerRef.current.setMap(null);
                    }

                    const pinUrl = window.location.origin + `/pin-${selectedPin}.svg`;
                    const markerImage = new window.kakao.maps.MarkerImage(
                      pinUrl,
                      new window.kakao.maps.Size(50, 55),
                      { offset: new window.kakao.maps.Point(25, 27) }
                    );
                    const marker = new window.kakao.maps.Marker({
                      position: moveLatLng,
                      map,
                      image: markerImage,
                      title: '내 위치',
                      zIndex: 10,
                    });
                    userMarkerRef.current = marker;
                  },
                  (error) => {
                    console.error('위치 접근 실패:', error.code, error.message);
                    if (error.code === 1) {
                      alert('위치 권한이 차단되어 있습니다.\n\n해제 방법:\n브라우저 주소창 왼쪽 자물쇠(🔒) 또는 정보(ℹ️) 아이콘 클릭\n→ 위치 → 허용으로 변경 후 새로고침해주세요.');
                    } else if (error.code === 2) {
                      alert('현재 위치를 확인할 수 없습니다.\nWi-Fi 또는 GPS를 활성화한 후 다시 시도해주세요.');
                    } else {
                      alert('위치 요청 시간이 초과되었습니다. 다시 시도해주세요.');
                    }
                  },
                  { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
                );
              }}
              className="flex items-center gap-1 bg-white/15 hover:bg-white/25 border border-white/25 px-2.5 py-1.5 rounded-xl transition-colors text-xs font-semibold text-white"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">내 위치</span>
            </button>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 sm:p-2 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 지도 (전체 화면) */}
      <div id="map" className="flex-1 relative bg-gray-100 min-h-[320px] sm:min-h-[400px]">
        {/* 로딩 오버레이 */}
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-50"
            style={{ background: 'linear-gradient(160deg, #0D1D42 0%, #1A3472 60%, #2a1810 100%)' }}>
            <div className="flex flex-col items-center gap-6">
              {/* 로고 */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full blur-2xl opacity-30"
                  style={{ background: '#E8521A', transform: 'scale(1.4)' }} />
                <img src="/logo.png" alt="신선구조대"
                  className="relative w-56 h-auto object-contain drop-shadow-2xl" />
              </div>
              {/* 스피너 */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-10 h-10">
                  <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#E8521A] animate-spin" />
                </div>
                <p className="text-white/70 text-sm font-medium tracking-wider">지도 불러오는 중...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 하단 배너 광고 */}
      {(() => {
        const slot1 = banners.filter(b => b.sort_order === 1);
        const slot2 = banners.filter(b => b.sort_order === 2);
        const BANNER_H = 88; // px

        const BannerSlot = ({ items, idx, placeholder }: { items: Banner[]; idx: number; placeholder: string }) => (
          <div className="flex-1 min-w-0 rounded-xl overflow-hidden bg-gray-100 relative shadow-sm" style={{ height: BANNER_H }}>
            {items.length > 0 ? (
              <>
                <div
                  className="transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateY(-${idx * BANNER_H}px)` }}
                >
                  {items.map(b => (
                    <a key={b.id} href={b.link_url || '#'} target="_blank" rel="noreferrer"
                      style={{ height: BANNER_H, display: 'block' }}>
                      <img src={b.image_url} alt={b.title}
                        className="w-full object-cover" style={{ height: BANNER_H }} />
                    </a>
                  ))}
                </div>
                {/* 제목 오버레이 */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 pointer-events-none">
                  <p className="text-white text-[10px] sm:text-xs font-bold truncate">
                    {items[idx]?.title}
                  </p>
                </div>
                {/* 페이지 인디케이터 */}
                {items.length > 1 && (
                  <div className="absolute top-1.5 right-1.5 flex gap-0.5 pointer-events-none">
                    {items.map((_, i) => (
                      <div key={i} className={`w-1 h-1 rounded-full transition-all ${i === idx ? 'bg-white' : 'bg-white/40'}`} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-300 rounded-xl">
                {placeholder}
              </div>
            )}
          </div>
        );

        return (
          <div className="bg-white px-3 py-2 flex flex-row gap-2 flex-shrink-0" style={{ boxShadow: '0 -6px 20px rgba(0,0,0,0.08)' }}>
            <BannerSlot items={slot1} idx={bannerIdx[0]} placeholder="배너 광고 1" />
            <BannerSlot items={slot2} idx={bannerIdx[1]} placeholder="배너 광고 2" />
          </div>
        );
      })()}

      {/* 상품 상세 팝업 */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            {/* 팝업 헤더: 1. 가게명 */}
            <div className="bg-gradient-to-r from-rescue-orange to-green-500 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{CATEGORY_EMOJI_MAP[selectedProduct.category] ?? '🛍️'}</div>
                  <div>
                    <h2 className="text-xl font-black">{selectedProduct.shop}</h2>
                  </div>
                </div>
                <button
                  onClick={() => {
                    console.log('Close popup clicked');
                    setSelectedProduct(null);
                  }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 팝업 내용 */}
            <div className="p-5 space-y-4">
              {/* 2. 가게 홍보문구 */}
              {selectedProduct.shopDescription && (
                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl">
                  {selectedProduct.shopDescription}
                </p>
              )}

              {/* 3. 가게 사진 */}
              {selectedProduct.shopImage && (
                <div className="overflow-hidden rounded-2xl bg-gray-100">
                  <img src={selectedProduct.shopImage} alt={selectedProduct.shop} className="w-full h-44 object-cover" />
                </div>
              )}

              {/* 4. 제품 정보 목록: 최대 3개 노출, 세로 스크롤 / 상품명 가로 스크롤 */}
              {(() => {
                const shopProducts = products.filter(p => p.shopId === selectedProduct.shopId);
                const displayProducts = shopProducts.length > 0 ? shopProducts : [selectedProduct];
                return (
                  <div
                    className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-y-auto"
                    style={{ maxHeight: `${3 * 52}px` }}
                  >
                    {displayProducts.map((product) => (
                      <div key={product.id} className="flex items-center gap-3 px-4 py-3 min-h-[52px]">
                        <div className="flex-1 overflow-x-auto scrollbar-none">
                          <span className="text-sm text-gray-900 font-semibold whitespace-nowrap">{product.name}</span>
                        </div>
                        <span className="text-sm text-rescue-orange font-black shrink-0">{product.price.toLocaleString()}원</span>
                        <span className="text-xs text-gray-400 shrink-0">재고 {product.stock ?? 0}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* 5. 구출하러 가기 */}
              <div className="pt-1">
                <button
                  onClick={() => {
                    const kakaoLink = `https://map.kakao.com/link/map/${encodeURIComponent(selectedProduct.shop)},${selectedProduct.lat},${selectedProduct.lng}`;
                    window.open(kakaoLink, '_blank');
                  }}
                  className="w-full bg-rescue-orange hover:bg-green-600 text-white text-lg font-bold py-4 rounded-2xl transition-all hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                >
                  <Phone className="w-5 h-5" />
                  구출하러 가기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 가게 정보 팝업 (상품 유무와 무관하게 표시) */}
      {selectedShop && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-rescue-orange to-green-500 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{CATEGORY_EMOJI_MAP[selectedShop.category] ?? '🛍️'}</div>
                  <div>
                    <h2 className="text-xl font-black">{selectedShop.shop_name}</h2>
                    <p className="text-sm text-white/80">{selectedShop.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedShop(null)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* 가게 사진 */}
              {selectedShop.shop_image_url && (
                <div className="overflow-hidden rounded-2xl bg-gray-100">
                  <img src={selectedShop.shop_image_url} alt={selectedShop.shop_name} className="w-full h-44 object-cover" />
                </div>
              )}

              {/* 가게 소개 */}
              {selectedShop.description && (
                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl">{selectedShop.description}</p>
              )}

              {/* 주소 / 전화 */}
              {selectedShop.address && (
                <div className="flex items-start gap-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-rescue-orange" />
                  <span>{selectedShop.address}</span>
                </div>
              )}
              {selectedShop.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="w-4 h-4 shrink-0 text-rescue-orange" />
                  <span>{selectedShop.phone}</span>
                </div>
              )}

              {/* 상품 목록 or 빈 안내 */}
              {(() => {
                const shopProducts = products.filter(p => p.shopId === selectedShop.id);
                return shopProducts.length > 0 ? (
                  <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-y-auto" style={{ maxHeight: `${3 * 52}px` }}>
                    {shopProducts.map((product) => (
                      <div key={product.id} className="flex items-center gap-3 px-4 py-3 min-h-[52px]">
                        <div className="flex-1 overflow-x-auto scrollbar-none">
                          <span className="text-sm text-gray-900 font-semibold whitespace-nowrap">{product.name}</span>
                        </div>
                        <span className="text-sm text-rescue-orange font-black shrink-0">{product.price.toLocaleString()}원</span>
                        <span className="text-xs text-gray-400 shrink-0">재고 {product.stock ?? 0}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-2xl">
                    <p className="text-sm font-bold">현재 등록된 구조 상품이 없습니다</p>
                    <p className="text-xs mt-1">곧 상품이 올라올 예정이에요!</p>
                  </div>
                );
              })()}

              {/* 구출하러 가기 */}
              <button
                onClick={() => {
                  const kakaoLink = `https://map.kakao.com/link/map/${encodeURIComponent(selectedShop.shop_name)},${selectedShop.latitude},${selectedShop.longitude}`;
                  window.open(kakaoLink, '_blank');
                }}
                className="w-full bg-rescue-orange text-white text-lg font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg"
              >
                <Navigation className="w-5 h-5" />
                길 찾기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 인증 모달 */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          initialTab={authInitialTab}
          initialRole={authInitialRole}
          lockedRole={authInitialRole}
        />
      )}
    </div>
  );
}

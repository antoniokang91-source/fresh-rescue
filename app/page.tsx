"use client";

import Link from 'next/link'
import { useEffect, useState } from "react";
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

export default function MapPage() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'join'>('login');
  const [authInitialRole, setAuthInitialRole] = useState<'user' | 'seller'>('user');
  const [map, setMap] = useState<any>(null);
  const { user, profile, signOut } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

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
        .eq('active', true)
        .limit(2);

      if (error) {
        console.error('배너 로드 실패:', error);
      } else if (data) {
        console.log('배너 로드 성공:', data);
        setBanners(data);
      }
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
          const categoryEmojiMap: Record<string, string> = {
            과일: '🍎',
            야채: '🥕',
            축산: '🥩',
            수산: '🐟',
            공산품: '📦',
            베이커리: '🥐',
            기타: '🛍️',
          };
          const categoryLabel = shop.category || '기타';
          const iconEmoji = categoryEmojiMap[categoryLabel] ?? '🛍️';
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
            const shopProducts = products.filter(p => p.shopId === shop.id);
            if (shopProducts.length > 0) {
              console.log('Shop marker clicked:', shop.shop_name);
              setSelectedProduct(shopProducts[0]);
            }
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
      const mapOption = {
        center: new window.kakao.maps.LatLng(37.5665, 126.978),
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
      console.log("✓ Map initialized successfully");

      // 지도 인터랙션 명시적 활성화
      newMap.setDraggable(true);
      newMap.setZoomable(true);

      // 지도 컨트롤 추가
      const mapTypeControl = new window.kakao.maps.MapTypeControl();
      newMap.addControl(mapTypeControl, window.kakao.maps.ControlPosition.TOPRIGHT);

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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-orange-50 to-white overflow-hidden">
      {/* 위 바 (헤더) */}
      <div className="bg-gradient-to-r from-rescue-orange to-orange-500 text-white px-3 py-2.5 sm:px-6 sm:py-4 flex flex-row items-center justify-between gap-2 flex-shrink-0 shadow-lg relative z-10">
        <div className="flex items-center gap-2">
          <div className="text-2xl animate-pulse">🚨</div>
          <div>
            <h1 className="text-base sm:text-xl font-black tracking-tight leading-tight">신선구조대</h1>
            <p className="text-[10px] sm:text-xs opacity-90 leading-tight hidden sm:block">지역 상권을 살리는 신선 식품 할인 마켓</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {profile ? (
            <>
              <div className="flex flex-col items-end text-right text-white/90 leading-tight">
                <span className="font-black text-sm">
                  {profile.nickname ? `${profile.nickname}님` : '대원님'}
                </span>
                <span className="text-[10px] opacity-90">
                  {profile.role === 'seller'
                    ? profile.seller_status === 'approved'
                      ? '사장님'
                      : '승인대기'
                    : '구조중'}
                </span>
              </div>
              {profile.role === 'seller' && profile.seller_status === 'approved' && (
                <Link
                  href="/seller/dashboard"
                  className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-colors text-xs sm:text-sm font-semibold"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">대시보드</span>
                </Link>
              )}
              <button
                onClick={signOut}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-colors text-xs sm:text-sm font-semibold"
              >
                <LogIn className="w-3.5 h-3.5 rotate-180" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleLogin('user')}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-colors text-xs sm:text-sm font-semibold"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">고객 로그인</span>
                <span className="sm:hidden text-[11px]">고객</span>
              </button>
              <button
                onClick={() => handleLogin('seller')}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-colors text-xs sm:text-sm font-semibold"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">사장님 로그인</span>
                <span className="sm:hidden text-[11px]">사장님</span>
              </button>
            </>
          )}
          <button
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ lat: latitude, lng: longitude });
                    if (map) {
                      const moveLatLng = new window.kakao.maps.LatLng(latitude, longitude);
                      map.setCenter(moveLatLng);
                      map.setLevel(4);
                    }
                  },
                  (error) => {
                    console.error('위치 접근 실패:', error);
                    alert('위치 접근이 거부되었거나 지원되지 않습니다.');
                  }
                );
              } else {
                alert('이 브라우저는 위치 서비스를 지원하지 않습니다.');
              }
            }}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-colors text-xs sm:text-sm font-semibold text-white"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">내 위치</span>
          </button>
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
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-50">
            <div className="text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <p className="text-xl font-semibold text-gray-600">지도를 불러오는 중...</p>
              <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</p>
            </div>
          </div>
        )}
      </div>

      {/* 하단 배너 광고 */}
      <div className="bg-white border-t border-gray-200 px-3 py-3 sm:px-4 sm:py-4 flex flex-row gap-3">
        {banners.length > 0 ? (
          banners.map((banner) => (
            <a
              key={banner.id}
              href={banner.link_url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 min-w-0 rounded-2xl overflow-hidden bg-gray-100 hover:shadow-lg transition-shadow"
            >
              <img src={banner.image_url} alt={banner.title} className="w-full h-24 sm:h-32 object-cover" />
              <div className="px-2.5 py-2 sm:p-3">
                <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{banner.title}</p>
              </div>
            </a>
          ))
        ) : (
          <>
            <div className="flex-1 min-w-0 h-28 sm:h-32 rounded-2xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs sm:text-sm text-gray-400">
              배너 광고 1
            </div>
            <div className="flex-1 min-w-0 h-28 sm:h-32 rounded-2xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs sm:text-sm text-gray-400">
              배너 광고 2
            </div>
          </>
        )}
      </div>

      {/* 상품 상세 팝업 */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            {/* 팝업 헤더 */}
            <div className="bg-gradient-to-r from-rescue-orange to-orange-500 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🛒</div>
                  <div>
                    <h2 className="text-xl font-black">{selectedProduct.shop}</h2>
                    <p className="text-sm opacity-90">{selectedProduct.name}</p>
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
            <div className="p-6 space-y-4">
              {/* 1. 상단: 전화, 홍보글 */}
              <div className="space-y-3">
                {selectedProduct.shopPhone && (
                  <a href={`tel:${selectedProduct.shopPhone}`} className="block text-sm text-gray-700 underline">
                    {selectedProduct.shopPhone}
                  </a>
                )}
                {selectedProduct.shopDescription && (
                  <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl">
                    {selectedProduct.shopDescription}
                  </p>
                )}
              </div>

              {/* 2. 중간 상단: 가게 사진 */}
              {selectedProduct.shopImage && (
                <div className="overflow-hidden rounded-3xl bg-gray-100">
                  <img src={selectedProduct.shopImage} alt={selectedProduct.shop} className="w-full h-48 object-cover" />
                </div>
              )}

              {/* 3. 중간 하단: 제품 정보 1줄 */}
              <div className="rounded-3xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-700 font-semibold truncate">
                  {selectedProduct.name} · {selectedProduct.price.toLocaleString()}원 · 재고 {selectedProduct.stock ?? 0}
                </p>
              </div>

              {/* 4. 하단 액션 */}
              <div className="space-y-3 pt-4">
                <button
                  onClick={() => {
                    const kakaoLink = `https://map.kakao.com/link/map/${encodeURIComponent(selectedProduct.shop)},${selectedProduct.lat},${selectedProduct.lng}`;
                    window.open(kakaoLink, '_blank');
                  }}
                  className="w-full bg-rescue-orange hover:bg-orange-600 text-white text-lg font-bold py-4 rounded-2xl transition-all hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                >
                  <Phone className="w-5 h-5" />
                  구출하러 가기
                </button>
              </div>
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

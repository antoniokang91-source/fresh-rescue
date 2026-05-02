"use client";

import Link from 'next/link'
import { useEffect, useState, useRef } from "react";
import { MapPin, Phone, Navigation, RefreshCw, X, Search } from "lucide-react";
import AuthModal from "@/components/auth/AuthModal";
import { useAuth } from '@/lib/auth-context'
import { supabase } from "@/lib/supabase";

declare global {
  interface Window { kakao: any; }
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
  is_search_ad?: boolean;
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

interface PinAd {
  id: string;
  shop_id: string | null;
  shop_name: string;
  end_date: string | null;
  is_active: boolean;
}

const DUMMY_PRODUCTS: Product[] = [
  { id: 'dummy-1', name: '신선한 과일 한 상자', price: 9800, originalPrice: 15000, discount: 35, timeLeft: 4, shop: '신선 마트', distance: 0.8, category: '과일', lat: 37.5665, lng: 126.978, shopId: 'shop-1' },
  { id: 'dummy-2', name: '즉석 샐러드 팩', price: 5500, originalPrice: 9000, discount: 39, timeLeft: 2, shop: '강남 채소시장', distance: 1.2, category: '야채', lat: 37.5655, lng: 126.976, shopId: 'shop-2' },
]

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  과일: '🍎', 야채: '🥕', 축산: '🥩', 수산: '🐟', 공산품: '📦', 베이커리: '🥐', 식당: '🍽️', 기타: '🛍️',
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildPinAdBubbleHTML(productName: string, productPrice: number): string {
  return `
    <div style="
      background:white; border:2px solid #0064FF; border-radius:14px;
      padding:5px 10px; box-shadow:0 4px 16px rgba(0,100,255,0.18);
      cursor:pointer; position:relative; white-space:nowrap;
      display:flex; align-items:center; gap:5px; pointer-events:auto;
      font-family:'Pretendard',-apple-system,sans-serif;
      overflow:hidden;
    ">
      <span data-bubble-name style="font-weight:700;font-size:11px;color:#191F28;display:inline-block;transition:opacity 0.2s ease,transform 0.2s ease;">${productName}</span>
      <span data-bubble-price style="font-weight:900;font-size:11px;color:#0064FF;display:inline-block;transition:opacity 0.2s ease,transform 0.2s ease;">${productPrice.toLocaleString()}원</span>
      <div style="
        position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);
        width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;
        border-top:9px solid #0064FF;
      "></div>
      <div style="
        position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);
        width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;
        border-top:8px solid white;
      "></div>
    </div>
  `;
}

export default function MapPage() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const mountTime = useRef(Date.now());
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [pinAds, setPinAds] = useState<PinAd[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'join'>('login');
  const [authInitialRole, setAuthInitialRole] = useState<'user' | 'seller'>('user');
  const [map, setMap] = useState<any>(null);
  const { user, profile, signOut } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerIdx, setBannerIdx] = useState([0, 0]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const userMarkerRef = useRef<any>(null);
  const [selectedPin] = useState<'white' | 'yellow' | 'blue' | 'green'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('fr_pin') as any) || 'yellow';
    return 'yellow';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [dbSearchResults, setDbSearchResults] = useState<Shop[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<any>(null);

  // ── 데이터 로드 ───────────────────────────────────────────────────────────────
  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: productData, error: productError } = await supabase
        .from('rescue_products').select('*').eq('status', 'active')
        .order('created_at', { ascending: false }).limit(50);

      if (productError) { setProducts(DUMMY_PRODUCTS); setIsLoading(false); return; }

      const { data: shopData } = await supabase.from('shops').select('*').eq('is_active', true).limit(50);
      const shopMap = new Map((shopData ?? []).map((s: any) => [s.id, s]));

      if (productData && productData.length > 0) {
        const formatted: Product[] = productData.map((item: any) => {
          const shop = shopMap.get(item.shop_id);
          const expireTime = item.expire_datetime ? new Date(item.expire_datetime).getTime() : null;
          const hoursLeft = expireTime ? Math.max(0, Math.ceil((expireTime - Date.now()) / (1000 * 60 * 60))) : 0;
          return {
            id: item.id, name: item.product_name, price: item.rescue_price,
            originalPrice: item.original_price,
            discount: Math.round(((item.original_price - item.rescue_price) / item.original_price) * 100),
            timeLeft: hoursLeft, shop: item.shop_name || shop?.shop_name || '알 수 없음',
            shopId: item.shop_id, category: item.category || shop?.category || '기타',
            description: item.description || '', stock: item.stock_quantity ?? 0,
            shopPhone: shop?.phone, shopImage: shop?.shop_image_url,
            shopDescription: shop?.description || '',
            distance: 1.0, lat: shop?.latitude ?? 37.5665, lng: shop?.longitude ?? 126.978,
          };
        });
        setProducts(formatted);
      }
      if (shopData && shopData.length > 0) setShops(shopData);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const loadBanners = async () => {
    const { data } = await supabase.from('banners').select('*').eq('is_active', true)
      .order('sort_order', { ascending: true }).order('created_at', { ascending: true });
    if (data) setBanners(data);
  };

  const loadPinAds = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from('pin_ads').select('*')
      .eq('is_active', true).or(`end_date.is.null,end_date.gte.${today}`);
    if (data) setPinAds(data as PinAd[]);
  };

  // ── Kakao 지도 스크립트 로드 ──────────────────────────────────────────────────
  useEffect(() => {
    if (window.kakao?.maps?.LatLng) { setMapLoaded(true); return; }
    const existing = document.querySelector('script[src*="dapi.kakao.com"]');
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => {
          let retries = 0;
          const check = () => {
            if (window.kakao.maps.LatLng && window.kakao.maps.Map && window.kakao.maps.Marker) {
              setMapLoaded(true);
            } else if (retries++ < 5) { setTimeout(check, 200); }
            else { setMapLoaded(true); }
          };
          check();
        });
      }
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => { loadData(); loadBanners(); loadPinAds(); }, []);

  // ── 스플래시 ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded) return;
    const elapsed = Date.now() - mountTime.current;
    const delay = Math.max(0, 2000 - elapsed);
    const t = setTimeout(() => {
      setSplashFading(true);
      setTimeout(() => setSplashVisible(false), 700);
    }, delay);
    return () => clearTimeout(t);
  }, [mapLoaded]);

  // ── 배너 자동 슬라이드 ────────────────────────────────────────────────────────
  useEffect(() => {
    const slot1 = banners.filter(b => b.sort_order === 1);
    const slot2 = banners.filter(b => b.sort_order === 2);
    if (slot1.length <= 1 && slot2.length <= 1) return;
    let t1: any = null, t2: any = null, off: any = null;
    if (slot1.length > 1) t1 = setInterval(() => setBannerIdx(p => [(p[0] + 1) % slot1.length, p[1]]), 3000);
    if (slot2.length > 1) off = setTimeout(() => { t2 = setInterval(() => setBannerIdx(p => [p[0], (p[1] + 1) % slot2.length]), 3000); }, 500);
    return () => { if (t1) clearInterval(t1); if (t2) clearInterval(t2); if (off) clearTimeout(off); };
  }, [banners]);

  // ── 마커 업데이트 ─────────────────────────────────────────────────────────────
  const updateMarkers = (targetMap?: any) => {
    const currentMap = targetMap || map;
    if (!currentMap || !window.kakao?.maps?.event) return;

    products.forEach((product) => {
      if (!product.lat || !product.lng) return;
      try {
        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(product.lat, product.lng),
          map: currentMap, title: product.name,
        });
        window.kakao.maps.event.addListener(marker, 'click', () => setSelectedProduct(product));
      } catch { }
    });

    shops.forEach((shop) => {
      if (!shop.latitude || !shop.longitude) return;
      try {
        const emoji = CATEGORY_EMOJI_MAP[shop.category] ?? '🛍️';
        const svg = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="#0064FF" stroke="white" stroke-width="3"/>
          <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="22">${emoji}</text>
        </svg>`;
        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(shop.latitude, shop.longitude),
          map: currentMap, title: shop.shop_name,
          image: new window.kakao.maps.MarkerImage(
            'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svg))),
            new window.kakao.maps.Size(40, 40)
          ),
        });
        window.kakao.maps.event.addListener(marker, 'click', () => setSelectedShop(shop));
      } catch { }

      // 핀 광고 말풍선
      const pinAd = pinAds.find(pa => pa.shop_id === shop.id && pa.is_active);
      if (pinAd) {
        try {
          const shopProds = products
            .filter(p => p.shopId === shop.id)
            .sort((a, b) => a.price - b.price); // 최저가 순
          if (shopProds.length === 0) throw new Error('no products');

          const el = document.createElement('div');
          el.innerHTML = buildPinAdBubbleHTML(shopProds[0].name, shopProds[0].price);
          el.style.cursor = 'pointer';
          el.addEventListener('click', () => setSelectedShop(shop));

          // 상품 2개 이상이면 자동 순환
          if (shopProds.length > 1) {
            let idx = 0;
            setInterval(() => {
              idx = (idx + 1) % shopProds.length;
              const nameEl = el.querySelector('[data-bubble-name]') as HTMLElement | null;
              const priceEl = el.querySelector('[data-bubble-price]') as HTMLElement | null;
              if (!nameEl || !priceEl) return;
              // 위로 슬라이드 아웃
              nameEl.style.opacity = '0';
              nameEl.style.transform = 'translateY(-6px)';
              priceEl.style.opacity = '0';
              priceEl.style.transform = 'translateY(-6px)';
              setTimeout(() => {
                nameEl.textContent = shopProds[idx].name;
                priceEl.textContent = shopProds[idx].price.toLocaleString() + '원';
                // 아래에서 슬라이드 인
                nameEl.style.transition = 'none';
                priceEl.style.transition = 'none';
                nameEl.style.transform = 'translateY(6px)';
                priceEl.style.transform = 'translateY(6px)';
                requestAnimationFrame(() => requestAnimationFrame(() => {
                  nameEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                  priceEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                  nameEl.style.opacity = '1';
                  nameEl.style.transform = 'translateY(0)';
                  priceEl.style.opacity = '1';
                  priceEl.style.transform = 'translateY(0)';
                }));
              }, 220);
            }, 2500);
          }

          new window.kakao.maps.CustomOverlay({
            position: new window.kakao.maps.LatLng(shop.latitude, shop.longitude),
            content: el, yAnchor: 2.1, zIndex: 20,
          }).setMap(currentMap);
        } catch { }
      }
    });
  };

  // ── 지도 초기화 ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !window.kakao?.maps?.LatLng) return;
    const mapContainer = document.getElementById("map");
    if (!mapContainer) return;
    try {
      const savedLoc = (() => { try { return JSON.parse(localStorage.getItem('fr_location') || 'null'); } catch { return null; } })();
      const newMap = new window.kakao.maps.Map(mapContainer, {
        center: new window.kakao.maps.LatLng(savedLoc?.lat ?? 37.5665, savedLoc?.lng ?? 126.978),
        level: 4, draggable: true, zoomable: true,
      });
      setMap(newMap);

      if (savedLoc) {
        const pinUrl = window.location.origin + `/pin-${selectedPin}.svg`;
        const markerImage = new window.kakao.maps.MarkerImage(pinUrl, new window.kakao.maps.Size(50, 55), { offset: new window.kakao.maps.Point(25, 27) });
        userMarkerRef.current = new window.kakao.maps.Marker({ position: new window.kakao.maps.LatLng(savedLoc.lat, savedLoc.lng), map: newMap, image: markerImage, title: '내 위치', zIndex: 10 });
      }

      newMap.setDraggable(true); newMap.setZoomable(true);
      setTimeout(() => { mapContainer.style.width = '100%'; mapContainer.style.height = '100%'; newMap.relayout(); updateMarkers(newMap); }, 1000);
    } catch (e) { console.error("Map init error:", e); }
  }, [mapLoaded]);

  useEffect(() => { if (map && mapLoaded) updateMarkers(map); }, [map, products, shops, pinAds, mapLoaded]);

  // ── DB 검색 (가게명 + 상품명, 10km 필터) ─────────────────────────────────────
  const performSearch = async (q: string) => {
    if (!q.trim()) { setDbSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    const baseLat = userLocation?.lat ?? 37.5665;
    const baseLng = userLocation?.lng ?? 126.978;

    const [{ data: shopData }, { data: productData }] = await Promise.all([
      supabase.from('shops').select('*').eq('is_active', true)
        .ilike('shop_name', `%${q}%`),
      supabase.from('rescue_products').select('shop_id').eq('status', 'active')
        .ilike('product_name', `%${q}%`),
    ]);

    // 상품 검색 결과에서 shop_id 수집 후 shops 추가 조회
    const productShopIds = [...new Set((productData ?? []).map((p: any) => p.shop_id).filter(Boolean))];
    let extraShops: Shop[] = [];
    if (productShopIds.length > 0) {
      const { data } = await supabase.from('shops').select('*').eq('is_active', true).in('id', productShopIds);
      extraShops = (data ?? []) as Shop[];
    }

    // 합치고 중복 제거
    const merged = new Map<string, Shop>();
    [...(shopData ?? []), ...extraShops].forEach((s: any) => merged.set(s.id, s));

    const results = Array.from(merged.values())
      .filter(s => s.latitude && s.longitude && haversineKm(baseLat, baseLng, s.latitude, s.longitude) <= 10)
      .sort((a, b) => Number(b.is_search_ad ?? false) - Number(a.is_search_ad ?? false));

    setDbSearchResults(results);
    setSearchLoading(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowSearchResults(true);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!value.trim()) { setDbSearchResults([]); return; }
    searchDebounce.current = setTimeout(() => performSearch(value), 350);
  };

  const handleLogin = (role: 'user' | 'seller' = 'user') => {
    setAuthInitialRole(role); setAuthInitialTab('login'); setShowAuthModal(true);
  };

  const handleLocate = () => {
    if (!navigator.geolocation) { alert('이 브라우저는 위치 서비스를 지원하지 않습니다.'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        setUserLocation({ lat: latitude, lng: longitude });
        localStorage.setItem('fr_location', JSON.stringify({ lat: latitude, lng: longitude }));
        if (!map) return;
        const latlng = new window.kakao.maps.LatLng(latitude, longitude);
        map.setCenter(latlng); map.setLevel(4);
        if (userMarkerRef.current) userMarkerRef.current.setMap(null);
        const pinUrl = window.location.origin + `/pin-${selectedPin}.svg`;
        const markerImage = new window.kakao.maps.MarkerImage(pinUrl, new window.kakao.maps.Size(50, 55), { offset: new window.kakao.maps.Point(25, 27) });
        userMarkerRef.current = new window.kakao.maps.Marker({ position: latlng, map, image: markerImage, title: '내 위치', zIndex: 10 });
      },
      (err) => {
        if (err.code === 1) alert('위치 권한이 차단되어 있습니다.\n브라우저 설정에서 위치를 허용해주세요.');
        else alert('위치를 가져올 수 없습니다. 다시 시도해주세요.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
    );
  };

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: '100dvh' }}>

      {/* ── Header (TDS) ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 flex items-center justify-between flex-shrink-0 shadow-sm" style={{ height: '56px' }}>
        <Link href="/" className="flex items-center shrink-0" style={{ width: 40, height: 40 }}>
          <img src="/logo.png" alt="신선구조대" style={{ width: 40, height: 40, objectFit: 'contain' }} />
        </Link>

        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <span className="font-semibold text-sm text-gray-900 hidden sm:inline">{profile.nickname ?? '대원님'}</span>
              {profile.role === 'seller' && profile.seller_status === 'approved' && (
                <Link href="/seller/dashboard"
                  className="bg-gray-100 text-gray-900 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-200 active:scale-95 transition-all">
                  대시보드
                </Link>
              )}
              <button onClick={signOut}
                className="text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-100 active:scale-95 transition-all">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <button onClick={() => handleLogin('user')}
                className="bg-gray-100 text-gray-900 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-200 active:scale-95 transition-all">
                고객님
              </button>
              <button onClick={() => handleLogin('seller')}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-sm">
                사장님
              </button>
            </>
          )}
          <button onClick={handleLocate}
            className="text-gray-600 p-2 rounded-lg hover:bg-gray-100 active:scale-95 transition-all">
            <Navigation className="w-4 h-4" />
          </button>
          <button onClick={loadData} disabled={isLoading}
            className="text-gray-600 p-2 rounded-lg hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 지도 + 플로팅 검색 ────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* 지도 (채도 낮춤으로 핀 강조) */}
        <div id="map" className="w-full h-full" style={{ filter: 'saturate(0.6)' }}
          onClick={() => setShowSearchResults(false)} />

        {/* 플로팅 검색바 (TDS) */}
        <div className="absolute top-4 left-4 right-4 z-[100]">
          <div className="relative bg-white rounded-xl shadow-lg" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              onFocus={() => setShowSearchResults(true)}
              placeholder="가게명, 상품명 검색 (10km 이내)"
              className="w-full bg-transparent rounded-xl pl-10 pr-10 py-3.5 text-sm outline-none text-gray-900 placeholder-gray-400 font-medium"
            />
            {searchQuery && (
              <button className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => { setSearchQuery(''); setDbSearchResults([]); setShowSearchResults(false); }}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}

            {/* 검색 결과 드롭다운 (TDS) */}
            {showSearchResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 bg-white rounded-xl shadow-2xl z-50 mt-2 overflow-hidden max-h-72 overflow-y-auto"
                style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                {searchLoading ? (
                  <div className="px-5 py-4 flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    검색 중...
                  </div>
                ) : dbSearchResults.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-gray-500">10km 이내에 '{searchQuery}' 결과가 없습니다</div>
                ) : dbSearchResults.map(shop => (
                  <button key={shop.id}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-gray-100 last:border-0 hover:bg-gray-50 active:bg-gray-100 transition-colors ${shop.is_search_ad ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      setSelectedShop(shop); setSearchQuery(''); setDbSearchResults([]); setShowSearchResults(false);
                      if (map && shop.latitude && shop.longitude) {
                        map.setCenter(new window.kakao.maps.LatLng(shop.latitude, shop.longitude));
                        map.setLevel(3);
                      }
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-lg">
                      {CATEGORY_EMOJI_MAP[shop.category] ?? '🛍️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{shop.shop_name}</p>
                        {shop.is_search_ad && (
                          <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold shrink-0">추천</span>
                        )}
                      </div>
                      {shop.address && <p className="text-xs text-gray-500 truncate">{shop.address}</p>}
                    </div>
                    <span className="text-xs text-gray-500 shrink-0 font-medium">
                      {haversineKm(userLocation?.lat ?? 37.5665, userLocation?.lng ?? 126.978, shop.latitude, shop.longitude).toFixed(1)}km
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Splash (TDS) ────────────────────────────────────────────────────── */}
      {splashVisible && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-gray-950"
          style={{ transition: 'opacity 0.7s ease', opacity: splashFading ? 0 : 1 }}>
          <img src="/logo.png" alt="신선구조대" className="w-20 h-20 object-contain mb-6" />
          <p className="text-white font-black text-xl tracking-tight mb-8">신선구조대</p>
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border-[3px] border-white/10" />
              <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-600 animate-spin" />
            </div>
            <p className="text-white/40 text-xs tracking-widest">LOADING</p>
          </div>
        </div>
      )}

      {/* ── 하단 배너 광고 ────────────────────────────────────────────────────── */}
      {(() => {
        const slot1 = banners.filter(b => b.sort_order === 1);
        const slot2 = banners.filter(b => b.sort_order === 2);
        const BANNER_H = 88;
        const BannerSlot = ({ items, idx, placeholder }: { items: Banner[]; idx: number; placeholder: string }) => (
          <div className="flex-1 min-w-0 rounded-xl overflow-hidden bg-gray-100 relative shadow-sm" style={{ height: BANNER_H }}>
            {items.length > 0 ? (
              <>
                <div className="transition-transform duration-500 ease-in-out" style={{ transform: `translateY(-${idx * BANNER_H}px)` }}>
                  {items.map(b => (
                    <a key={b.id} href={b.link_url || '#'} target="_blank" rel="noreferrer" style={{ height: BANNER_H, display: 'block' }}>
                      <img src={b.image_url} alt={b.title} className="w-full object-cover" style={{ height: BANNER_H }} />
                    </a>
                  ))}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent px-3 py-2.5 pointer-events-none">
                  <p className="text-white text-xs font-semibold truncate">{items[idx]?.title}</p>
                </div>
                {items.length > 1 && (
                  <div className="absolute top-2.5 right-2.5 flex gap-1 pointer-events-none">
                    {items.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white' : 'bg-white/50'}`} />)}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 rounded-xl">{placeholder}</div>
            )}
          </div>
        );
        return (
          <div className="bg-white px-3 py-3 flex gap-2 flex-shrink-0 shadow-sm" style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.04)' }}>
            <BannerSlot items={slot1} idx={bannerIdx[0]} placeholder="배너 광고 1" />
            <BannerSlot items={slot2} idx={bannerIdx[1]} placeholder="배너 광고 2" />
          </div>
        );
      })()}

      {/* ── Product Detail Modal (TDS) ────────────────────────────────────── */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="bg-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl">
                    {CATEGORY_EMOJI_MAP[selectedProduct.category] ?? '🛍️'}
                  </div>
                  <h2 className="text-lg font-semibold">{selectedProduct.shop}</h2>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {selectedProduct.shopDescription && (
                <p className="text-sm text-gray-600 bg-gray-100 p-4 rounded-xl">{selectedProduct.shopDescription}</p>
              )}
              {selectedProduct.shopImage && (
                <div className="overflow-hidden rounded-2xl"><img src={selectedProduct.shopImage} alt={selectedProduct.shop} className="w-full h-44 object-cover" /></div>
              )}
              {(() => {
                const shopProducts = products.filter(p => p.shopId === selectedProduct.shopId);
                const display = shopProducts.length > 0 ? shopProducts : [selectedProduct];
                return (
                  <div className="rounded-xl border border-gray-200 overflow-y-auto" style={{ maxHeight: `${3 * 64}px` }}>
                    {display.map((p, i) => (
                      <div key={p.id} className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors ${i < display.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        {/* left */}
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0">
                          {CATEGORY_EMOJI_MAP[p.category] ?? '🛍️'}
                        </div>
                        {/* contents */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                          {p.description && <p className="text-xs text-gray-500 truncate">{p.description}</p>}
                        </div>
                        {/* right */}
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-sm font-semibold text-blue-600">{p.price.toLocaleString()}원</span>
                          <span className="text-xs text-gray-500">재고 {p.stock ?? 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <button
                onClick={() => { const kakaoLink = `https://map.kakao.com/link/map/${encodeURIComponent(selectedProduct.shop)},${selectedProduct.lat},${selectedProduct.lng}`; window.open(kakaoLink, '_blank'); }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold py-4 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg">
                <Phone className="w-5 h-5" /> 구출하러 가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Shop Modal (TDS) ───────────────────────────────────────────────── */}
      {selectedShop && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="bg-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl">
                    {CATEGORY_EMOJI_MAP[selectedShop.category] ?? '🛍️'}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{selectedShop.shop_name}</h2>
                    <p className="text-sm text-white/80">{selectedShop.category}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedShop(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {selectedShop.shop_image_url && (
                <div className="overflow-hidden rounded-2xl"><img src={selectedShop.shop_image_url} alt={selectedShop.shop_name} className="w-full h-44 object-cover" /></div>
              )}
              {selectedShop.description && (
                <p className="text-sm text-gray-600 bg-gray-100 p-4 rounded-xl">{selectedShop.description}</p>
              )}
              {selectedShop.address && (
                <div className="flex items-start gap-3 text-sm text-gray-700">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                  <span>{selectedShop.address}</span>
                </div>
              )}
              {selectedShop.phone && (
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <Phone className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>{selectedShop.phone}</span>
                </div>
              )}
              {(() => {
                const shopProducts = products.filter(p => p.shopId === selectedShop.id);
                return shopProducts.length > 0 ? (
                  <div className="rounded-xl border border-gray-200 overflow-y-auto" style={{ maxHeight: `${3 * 64}px` }}>
                    {shopProducts.map((p, i) => (
                      <div key={p.id} className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors ${i < shopProducts.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        {/* left */}
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0">
                          {CATEGORY_EMOJI_MAP[p.category] ?? '🛍️'}
                        </div>
                        {/* contents */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                          {p.description && <p className="text-xs text-gray-500 truncate">{p.description}</p>}
                        </div>
                        {/* right */}
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-sm font-semibold text-blue-600">{p.price.toLocaleString()}원</span>
                          <span className="text-xs text-gray-500">재고 {p.stock ?? 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                    <p className="text-sm font-semibold">현재 등록된 구조 상품이 없습니다</p>
                    <p className="text-xs mt-1">곧 상품이 올라올 예정이에요!</p>
                  </div>
                );
              })()}
              <button
                onClick={() => { const kakaoLink = `https://map.kakao.com/link/map/${encodeURIComponent(selectedShop.shop_name)},${selectedShop.latitude},${selectedShop.longitude}`; window.open(kakaoLink, '_blank'); }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold py-4 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg">
                <Navigation className="w-5 h-5" /> 길 찾기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 인증 모달 ─────────────────────────────────────────────────────────── */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} initialTab={authInitialTab}
          initialRole={authInitialRole} lockedRole={authInitialRole} />
      )}
    </div>
  );
}

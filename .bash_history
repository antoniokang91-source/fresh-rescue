  const [searchKeyword, setSearchKeyword] = useState('');
  const [mapCenter, setMapCenter] = useState({ lat: 35.8714, lng: 128.6014 });
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
    handleMyLocation();
  }, []);

  const fetchData = async () => {
    // stores 테이블에서 info, image_url 포함 호출
    const { data: storeData } = await supabase
      .from('stores')
      .select(`*, rescue_items!rescue_items_store_id_fkey(*)`)
      .eq('status', 'approved');
    
    if (storeData) {
      const formatted = storeData.map(s => ({
        ...s,
        lat: parseFloat(String(s.lat)),
        lng: parseFloat(String(s.lng)),
        category: s.category || 'fruit',
        rescue_items: s.rescue_items?.filter((item: any) => item.deleted_at === null) || []
      }));
      setAllStores(formatted);
      setFilteredStores(formatted);
    }

    const { data: bannerData } = await supabase.from('banners').select('*').eq('is_active', true);
    if (bannerData) setBanners(bannerData);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const keyword = searchKeyword.trim();
    if (!keyword) {
      setFilteredStores(allStores);
      return;
    }

    const searchResult = allStores.filter(store => {
      const hasItem = store.rescue_items.some((item: any) => item.fruit_name.includes(keyword));
      const hasStoreName = store.name.includes(keyword);
      return hasItem || hasStoreName;
    });

    if (searchResult.length > 0) {
      setFilteredStores(searchResult);
      const bounds = new window.kakao.maps.LatLngBounds();
      searchResult.forEach(s => bounds.extend(new window.kakao.maps.LatLng(s.lat, s.lng)));
      map?.setBounds(bounds);
    } else {
      if (window.kakao?.maps?.services) {
        const ps = new window.kakao.maps.services.Places();
        ps.keywordSearch(keyword, (data: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const newCenter = { lat: parseFloat(data[0].y), lng: parseFloat(data[0].x) };
            setMapCenter(newCenter);
            map.setCenter(new window.kakao.maps.LatLng(newCenter.lat, newCenter.lng));
            setFilteredStores(allStores);
          }
        });
      }
    }
    searchInputRef.current?.blur();
  };

  const handleMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMapCenter({ lat, lng });
        map?.setCenter(new window.kakao.maps.LatLng(lat, lng));
      }, null, { enableHighAccuracy: true });
    }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-white overflow-hidden flex flex-col font-sans text-[#1a1a1a]">
      {/* 상단 검색바 */}
      <div className="absolute top-4 left-0 right-0 z-20 px-4 pointer-events-none">
        <form onSubmit={handleSearch} className="relative max-w-md mx-auto pointer-events-auto">
          <input
            ref={searchInputRef}
            type="text" 
            placeholder="오늘 내가 구조할 과일은?" 
            className="w-full p-4 pl-12 bg-white/95 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-3xl font-bold border-none outline-none focus:ring-2 focus:ring-orange-300"
            value={searchKeyword} 
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
          {searchKeyword && (
            <button type="button" onClick={() => {setSearchKeyword(''); setFilteredStores(allStores);}} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">✕</button>
          )}
        </form>
      </div>

      {/* 지도 영역 */}
      <div className="flex-1 w-full relative">
        <Map center={mapCenter} className="w-full h-full" level={4} onCreate={setMap}>
          {filteredStores.map((store) => {
            const cat = categoryIcons[store.category] || categoryIcons.default;
            return (
              <CustomOverlayMap key={store.id} position={{ lat: store.lat, lng: store.lng }} clickable={true}>
                <button onClick={() => setSelectedStore(store)} className="relative flex flex-col items-center group active:scale-95 transition-transform" style={{ transform: 'translateY(-50%)' }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.3)] border-4 border-white" style={{ backgroundColor: cat.color }}>
                    <span className="text-3xl">{cat.icon}</span>
                  </div>
                  <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px]" style={{ borderTopColor: cat.color }}></div>
                </button>
              </CustomOverlayMap>
            );
          })}

          {selectedStore && (
            <CustomOverlayMap position={{ lat: selectedStore.lat, lng: selectedStore.lng }}>
              <div className="bg-white p-5 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-orange-100 w-[300px] mb-64 relative animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: categoryIcons[selectedStore.category]?.color || '#6b7280' }}>
                        {categoryIcons[selectedStore.category]?.label || 'SHOP'}
                      </span>
                      <span className="text-[14px]">{categoryIcons[selectedStore.category]?.icon}</span>
                    </div>
                    <h3 className="text-xl font-black text-gray-950 leading-tight">{selectedStore.name}</h3>
                  </div>
                  <button onClick={() => setSelectedStore(null)} className="text-gray-300 hover:text-gray-500 text-3xl px-1">×</button>
                </div>

                {/* 가게 전경 사진 */}
                <div className="w-full aspect-square bg-gray-100 rounded-2xl mb-4 overflow-hidden border border-gray-50 flex items-center justify-center">
                  {selectedStore.image_url && selectedStore.image_url !== 'EMPTY' ? (
                    <img src={selectedStore.image_url} alt="가게전경" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <p className="text-3xl mb-1">📸</p>
                      <p className="text-[10px] text-gray-400 font-bold">사진 등록 중</p>
                    </div>
                  )}
                </div>

                {/* ⭐ 수정: 자동 줄바꿈이 적용된 가게 소개 영역 */}
                <div className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-600 font-bold leading-relaxed italic text-center break-all whitespace-pre-wrap">
                    "{selectedStore.info || "우리 동네 싱싱한 먹거리를 책임지는 구조대입니다!"}"
                  </p>
                </div>

                <div className="space-y-2 mb-5 max-h-[120px] overflow-y-auto pr-1">
                  <p className="text-[10px] font-black text-orange-500 ml-1">지금 바로 구조 가능한 품목 👇</p>
                  {selectedStore.rescue_items?.map((item: any) => (
                    <div key={item.id} className="bg-white p-3 rounded-xl flex justify-between items-center border border-orange-100 shadow-sm">
                      <span className="font-bold text-gray-800 text-sm">{item.fruit_name}</span>
                      <span className="font-extrabold text-orange-600 text-sm">{item.price.toLocaleString()}원</span>
                    </div>
                  ))}
                </div>

                <a href={`tel:${selectedStore.phone}`} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black text-center block no-underline shadow-[0_4px_12px_rgba(234,88,12,0.3)] active:scale-95 transition-all">
                  📞 구조 하기 (전화하기)
                </a>
              </div>
            </CustomOverlayMap>
          )}
        </Map>
        <button onClick={handleMyLocation} className="absolute bottom-6 right-4 z-20 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-xl border border-gray-100">🎯</button>
      </div>

      {/* 하단 배너 및 입점 신청 */}
      <div className="h-28 bg-white border-t border-gray-100 flex items-center px-4 gap-3 z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        <div className="flex-[1.8] h-16 bg-gray-50 rounded-2xl relative overflow-hidden shadow-inner border border-gray-100">
          {banners[currentBannerIndex] ? (
            <a href={banners[currentBannerIndex].link_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
              <img src={banners[currentBannerIndex].image_url} alt="banner" className="w-full h-full object-cover" />
            </a>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fruit Rescue</div>
          )}
        </div>
        <button onClick={() => router.push('/login')} className="flex-1 h-16 bg-[#22C55E] text-white rounded-2xl font-black text-[11px] shadow-md active:scale-95 transition-all">입점 신청하기</button>
      </div>
    </div>
  );
}
EOF

npm run dev
cat << 'EOF' > app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    // 번호에서 하이픈 제거 및 국가코드 처리 (+8210...)
    const cleanPhone = phone.replace(/-/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `+82${cleanPhone.substring(1)}` : cleanPhone;

    if (isSignUp) {
      // [회원가입] 사장님이 비밀번호를 처음 등록할 때
      const { error } = await supabase.auth.signUp({
        phone: formattedPhone,
        password: password,
      });
      if (error) alert('가입 실패: ' + error.message);
      else alert('비밀번호가 등록되었습니다! 이제 로그인해주세요.');
    } else {
      // [로그인] 등록된 비밀번호로 접속할 때
      const { error } = await supabase.auth.signInWithPassword({
        phone: formattedPhone,
        password: password,
      });
      if (error) alert('로그인 실패: 번호나 비밀번호를 확인해주세요.');
      else router.push('/dashboard');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-white px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-black text-orange-600 italic">과일구조대</h2>
          <p className="mt-2 text-sm font-bold text-gray-500">사장님 전용 관리 센터</p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleAuth}>
          <input
            type="tel"
            placeholder="전화번호 (01012345678)"
            className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-orange-400 font-bold"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            type="password"
            placeholder="비밀번호 설정"
            className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-orange-400 font-bold"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          <button type="submit" className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">
            {isSignUp ? '비밀번호 등록 및 가입' : '로그인'}
          </button>
        </form>

        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-sm font-bold text-gray-400 text-center underline"
        >
          {isSignUp ? '이미 비밀번호를 등록하셨나요? 로그인' : '처음이신가요? 비밀번호 등록하기'}
        </button>
      </div>
    </div>
  );
}
EOF

cat << 'EOF' > app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editInfo, setEditInfo] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchStoreAndLink();
  }, []);

  const fetchStoreAndLink = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // 로그인한 사장님의 번호를 DB 형식(010...)으로 변환
    const loginPhone = user.phone?.replace('+82', '0') || '';

    // 1. owner_id가 나로 등록되어 있거나, 혹은 번호가 일치하는 가게 찾기
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .or(`owner_id.eq.${user.id},phone.eq.${loginPhone}`)
      .maybeSingle();

    if (data) {
      // 2. 번호로 매칭된 경우, 앞으로는 ID로 바로 찾을 수 있게 owner_id 자동 업데이트 (최초 1회)
      if (!data.owner_id) {
        await supabase.from('stores').update({ owner_id: user.id }).eq('id', data.id);
      }
      setStore(data);
      setEditInfo(data.info || '');
      setEditImageUrl(data.image_url || '');
    }
    setLoading(false);
  };

  const handleUpdateStore = async () => {
    if (!store) return;

    const { error } = await supabase
      .from('stores')
      .update({ 
        info: editInfo, 
        image_url: editImageUrl 
      })
      .eq('id', store.id);

    if (error) {
      alert('업데이트 실패: ' + error.message);
    } else {
      alert('가게 정보가 성공적으로 저장되었습니다! 🎉');
      fetchStoreAndLink();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="p-10 text-center font-bold">내 가게 정보를 불러오는 중...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white min-h-screen shadow-lg flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-orange-600 italic">가게 관리 센터</h1>
        <button onClick={handleLogout} className="text-xs font-bold text-gray-400 border px-3 py-1 rounded-lg">로그아웃</button>
      </div>
      
      {store ? (
        <div className="space-y-6 flex-1">
          {/* 가게 기본 정보 표시 */}
          <div className="bg-orange-50 p-5 rounded-[24px] border border-orange-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded">구조대 상점</span>
              <p className="text-xs text-orange-600 font-bold">No.{store.id}</p>
            </div>
            <h2 className="text-xl font-black text-gray-900">{store.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{store.address}</p>
          </div>

          {/* 📸 1. 가게 사진 등록 (image_url) */}
          <div className="space-y-2">
            <label className="text-sm font-black text-gray-700 ml-1 flex items-center gap-1">
              <span>📸</span> 가게 전경 사진 URL
            </label>
            <input 
              type="text" 
              value={editImageUrl} 
              onChange={(e) => setEditImageUrl(e.target.value)}
              placeholder="https://... 이미지 주소를 입력해주세요"
              className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-400 font-bold transition-all"
            />
            {editImageUrl && (
              <div className="w-full aspect-video rounded-2xl overflow-hidden border border-gray-100 mt-2 shadow-inner">
                <img src={editImageUrl} alt="가게 사진 미리보기" className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-[10px] text-gray-400 ml-1">* 정사각형 또는 와이드 이미지가 예쁘게 나옵니다.</p>
          </div>

          {/* 💬 2. 가게 소개 문구 (info) */}
          <div className="space-y-2">
            <label className="text-sm font-black text-gray-700 ml-1 flex items-center gap-1">
              <span>✍️</span> 우리 가게 소개 문구
            </label>
            <textarea 
              rows={4}
              value={editInfo} 
              onChange={(e) => setEditInfo(e.target.value)}
              placeholder="예: 매일 새벽 매천시장에서 직접 공수한 싱싱한 과일만 고집합니다! 믿고 방문해 주세요."
              className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-400 font-bold resize-none transition-all leading-relaxed"
            />
            <p className="text-[10px] text-gray-400 ml-1">* 고객용 지도 상세 팝업에 노출됩니다.</p>
          </div>

          <button 
            onClick={handleUpdateStore}
            className="w-full bg-orange-500 text-white py-5 rounded-[24px] font-black text-lg shadow-[0_8px_20px_rgba(234,88,12,0.3)] active:scale-95 transition-all mt-4"
          >
            가게 정보 저장하기 💾
          </button>
          
          <div className="pt-8 text-center">
             <button onClick={() => router.push('/')} className="text-gray-400 font-bold text-sm hover:text-orange-500 transition-colors">← 실시간 지도 확인하기</button>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 flex flex-col items-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="font-bold text-gray-400 mb-6">등록된 가게 정보를 찾을 수 없습니다.<br/>관리자에게 문의하거나 번호를 확인해 주세요.</p>
          <button onClick={() => router.push('/login')} className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg">로그인 다시 하기</button>
        </div>
      )}
    </div>
  );
}
EOF

npm run dev
cat << 'EOF' > app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editInfo, setEditInfo] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchStoreAndLink();
  }, []);

  const fetchStoreAndLink = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const loginPhone = user.phone?.replace('+82', '0') || '';

    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .or(`owner_id.eq.${user.id},phone.eq.${loginPhone}`)
      .maybeSingle();

    if (data) {
      if (!data.owner_id) {
        await supabase.from('stores').update({ owner_id: user.id }).eq('id', data.id);
      }
      setStore(data);
      setEditInfo(data.info || '');
      setEditImageUrl(data.image_url || '');
    }
    setLoading(false);
  };

  const handleUpdateStore = async () => {
    if (!store) return;
    const { error } = await supabase
      .from('stores')
      .update({ info: editInfo, image_url: editImageUrl })
      .eq('id', store.id);

    if (error) alert('업데이트 실패: ' + error.message);
    else alert('가게 정보가 성공적으로 저장되었습니다! 🚀');
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen font-bold text-gray-400">정보 확인 중...</div>;

  return (
    <div className="flex flex-col items-center min-h-[100dvh] bg-white">
      {/* 상단 오렌지 데코 라인 */}
      <div className="w-full h-4 bg-[#FFEDE0]"></div>
      
      <div className="w-full max-w-sm px-6 py-12 flex flex-col items-center">
        {/* 로고 영역 */}
        <div className="w-16 h-16 bg-[#FFF2E8] rounded-3xl flex items-center justify-center mb-4 shadow-sm">
          <span className="text-3xl">🍎</span>
        </div>
        
        <h2 className="text-2xl font-black text-[#FF5C00] mb-1">과일구조대</h2>
        <p className="text-sm font-bold text-gray-400 mb-10">사장님 전용 채널</p>

        {store ? (
          <div className="w-full space-y-8">
            {/* 가게 정보 헤더 */}
            <div className="text-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-[#FF5C00] mb-1 uppercase tracking-widest">Store Profile</p>
              <h3 className="text-xl font-black text-gray-800">{store.name}</h3>
            </div>

            {/* 사진 주소 입력 */}
            <div className="space-y-2">
              <label className="text-[13px] font-black text-gray-400 ml-1">가게 사진 URL</label>
              <input 
                type="text" 
                value={editImageUrl} 
                onChange={(e) => setEditImageUrl(e.target.value)}
                placeholder="이미지 주소를 입력해주세요"
                className="w-full p-4 bg-[#F8F9FB] rounded-[20px] border-none outline-none focus:ring-2 focus:ring-[#FFEDE0] font-bold text-center text-sm shadow-sm"
              />
            </div>

            {/* 소개 문구 입력 */}
            <div className="space-y-2">
              <label className="text-[13px] font-black text-gray-400 ml-1">가게 소개 문구</label>
              <textarea 
                rows={3}
                value={editInfo} 
                onChange={(e) => setEditInfo(e.target.value)}
                placeholder="우리 가게를 소개해주세요 (자동 줄바꿈)"
                className="w-full p-5 bg-[#F8F9FB] rounded-[20px] border-none outline-none focus:ring-2 focus:ring-[#FFEDE0] font-bold text-center text-sm shadow-sm resize-none leading-relaxed"
              />
            </div>

            {/* 저장 버튼 */}
            <button 
              onClick={handleUpdateStore}
              className="w-full bg-[#FF5C00] text-white py-5 rounded-[25px] font-black text-lg shadow-[0_8px_25px_rgba(255,92,0,0.2)] active:scale-95 transition-all"
            >
              정보 수정 완료 🚀
            </button>

            <button 
              onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
              className="w-full text-xs font-bold text-gray-300 text-center mt-4"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="font-bold text-gray-400">연결된 가게 정보가 없습니다.</p>
            <button onClick={() => router.push('/login')} className="text-[#FF5C00] font-black border-b border-[#FF5C00]">다시 로그인하기</button>
          </div>
        )}
      </div>
    </div>
  );
}
EOF

npm run dev
'use client';
import { useState } from 'react';
import { supabase } from '@/utils/supabase';
export default function SignUpPage() {
}
cat << 'EOF' > app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editInfo, setEditInfo] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchStoreAndLink();
  }, []);

  const fetchStoreAndLink = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const loginPhone = user.phone?.replace('+82', '0') || '';
    const { data } = await supabase
      .from('stores')
      .select('*')
      .or(`owner_id.eq.${user.id},phone.eq.${loginPhone}`)
      .maybeSingle();

    if (data) {
      if (!data.owner_id) {
        await supabase.from('stores').update({ owner_id: user.id }).eq('id', data.id);
      }
      setStore(data);
      setEditInfo(data.info || '');
      setEditImageUrl(data.image_url || '');
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    const { error } = await supabase
      .from('stores')
      .update({ info: editInfo, image_url: editImageUrl })
      .eq('id', store.id);
    if (!error) alert('수정 완료! 🚀');
  };

  if (loading) return null;

  return (
    <div className="flex flex-col items-center min-h-screen bg-white font-sans">
      <div className="w-full h-2 bg-[#FFEDE0]"></div>
      <div className="w-full max-w-md px-8 py-12 flex flex-col items-center">
        <div className="w-16 h-16 bg-[#FFF2E8] rounded-[24px] flex items-center justify-center mb-4">
          <span className="text-3xl">🍎</span>
        </div>
        <h2 className="text-2xl font-black text-[#FF5C00] mb-1">과일구조대</h2>
        <p className="text-[13px] font-bold text-gray-400 mb-10">사장님 전용 채널</p>

        {store && (
          <div className="w-full space-y-6">
            <div className="space-y-1">
              <label className="text-[12px] font-black text-gray-300 ml-4">가게 사진 URL</label>
              <input 
                type="text" value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)}
                className="w-full p-5 bg-[#F8F9FB] rounded-[28px] border-none outline-none font-bold text-sm text-center"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-black text-gray-300 ml-4">가게 소개 문구</label>
              <textarea 
                rows={3} value={editInfo} onChange={(e) => setEditInfo(e.target.value)}
                className="w-full p-5 bg-[#F8F9FB] rounded-[28px] border-none outline-none font-bold text-sm text-center resize-none"
              />
            </div>
            <button onClick={handleUpdate} className="w-full bg-[#FF5C00] text-white py-5 rounded-[30px] font-black text-lg shadow-lg">
              정보 수정 완료 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
EOF

npm run dev
cat << 'EOF' > app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/-/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `+82${cleanPhone.substring(1)}` : cleanPhone;
    
    const { error } = await supabase.auth.signInWithPassword({
      phone: formattedPhone,
      password: password,
    });

    if (error) {
      alert('로그인 실패: 번호나 비밀번호를 확인해주세요.');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-white px-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* 로고 및 타이틀 */}
        <h2 className="text-3xl font-black text-[#FF5C00] italic mb-1">과일구조대</h2>
        <p className="text-sm font-bold text-gray-600 mb-10">사장님 전용 관리 센터</p>

        {/* 로그인 폼 */}
        <form className="w-full space-y-4" onSubmit={handleLogin}>
          <input
            type="tel"
            placeholder="전화번호 (01012345678)"
            className="w-full p-5 bg-[#F8F9FB] rounded-[25px] border-none outline-none font-bold text-gray-700 placeholder:text-gray-400 shadow-sm transition-all focus:ring-2 focus:ring-[#FFEDE0]"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            className="w-full p-5 bg-[#F8F9FB] rounded-[25px] border-none outline-none font-bold text-gray-700 placeholder:text-gray-400 shadow-sm transition-all focus:ring-2 focus:ring-[#FFEDE0]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button 
            type="submit" 
            className="w-full bg-[#FF5C00] text-white py-5 rounded-[25px] font-black text-lg shadow-[0_8px_20px_rgba(255,92,0,0.2)] active:scale-95 transition-all"
          >
            로그인
          </button>
        </form>

        {/* 회원가입 직통 링크 */}
        <button 
          onClick={() => router.push('/signup')}
          className="mt-8 text-sm font-bold text-gray-600 underline decoration-gray-300 underline-offset-4 hover:text-[#FF5C00] transition-colors"
        >
          처음이신가요? 회원가입하기
        </button>
      </div>
    </div>
  );
}
EOF

cat << 'EOF' > app/signup/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    businessName: '',
    phone: '',
    password: '',
    email: '',
    info: '',
    imageUrl: '',
    licenseUrl: ''
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Supabase Auth 계정 생성 (핸드폰 기반)
    const cleanPhone = formData.phone.replace(/-/g, '');
    const formattedPhone = `+82${cleanPhone.substring(1)}`;
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      phone: formattedPhone,
      password: formData.password,
    });

    if (authError) return alert('회원가입 실패: ' + authError.message);

    // 2. stores 테이블에 상세 정보 등록 (pending 상태로 저장)
    const { error: dbError } = await supabase.from('stores').insert([{
      name: formData.businessName,
      phone: cleanPhone,
      email: formData.email,
      info: formData.info,
      image_url: formData.imageUrl,
      business_license_url: formData.licenseUrl,
      owner_id: authData.user?.id,
      status: 'pending' 
    }]);

    if (dbError) {
      alert('데이터 저장 실패: ' + dbError.message);
    } else {
      alert('회원가입 신청이 완료되었습니다! 관리자 승인 후 로그인이 가능합니다. 🚀');
      router.push('/login');
    }
  };

  return (
    <div className="flex flex-col items-center min-h-[100dvh] bg-white px-6 py-10 overflow-y-auto">
      <div className="w-full h-1 bg-[#FFEDE0] absolute top-0 left-0"></div>
      
      <div className="w-full max-w-sm space-y-6 pt-4">
        <div className="text-center">
          <h2 className="text-2xl font-black text-[#FF5C00] mb-1">사장님 회원가입</h2>
          <p className="text-xs font-bold text-gray-500 mb-8">구조대 합류를 위해 정보를 입력해주세요</p>
        </div>
        
        <form className="space-y-5" onSubmit={handleSignUp}>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 ml-4">필수 정보</label>
            <input placeholder="사업자명 (가게명)" className="w-full p-4 bg-[#F8F9FB] rounded-[20px] outline-none font-bold text-gray-700 shadow-sm focus:ring-1 focus:ring-orange-200" 
                   onChange={e => setFormData({...formData, businessName: e.target.value})} required />
            <input placeholder="핸드폰번호 (숫자만)" className="w-full p-4 bg-[#F8F9FB] rounded-[20px] outline-none font-bold text-gray-700 shadow-sm focus:ring-1 focus:ring-orange-200" 
                   onChange={e => setFormData({...formData, phone: e.target.value})} required />
            <input type="password" placeholder="비밀번호 설정" className="w-full p-4 bg-[#F8F9FB] rounded-[20px] outline-none font-bold text-gray-700 shadow-sm focus:ring-1 focus:ring-orange-200" 
                   onChange={e => setFormData({...formData, password: e.target.value})} required />
            <input type="email" placeholder="이메일 주소" className="w-full p-4 bg-[#F8F9FB] rounded-[20px] outline-none font-bold text-gray-700 shadow-sm focus:ring-1 focus:ring-orange-200" 
                   onChange={e => setFormData({...formData, email: e.target.value})} required />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 ml-4">가게 홍보 및 서류</label>
            <textarea placeholder="가게 소개 (지도에 표시됩니다)" className="w-full p-4 bg-[#F8F9FB] rounded-[20px] outline-none font-bold text-gray-700 shadow-sm resize-none focus:ring-1 focus:ring-orange-200" rows={2}
                      onChange={e => setFormData({...formData, info: e.target.value})} />
            <input placeholder="가게 대표 사진 URL" className="w-full p-4 bg-[#F8F9FB] rounded-[20px] outline-none font-bold text-gray-700 shadow-sm focus:ring-1 focus:ring-orange-200" 
                   onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
            <input placeholder="사업자등록증 이미지 URL" className="w-full p-4 bg-[#F8F9FB] rounded-[20px] outline-none font-bold text-gray-700 shadow-sm focus:ring-1 focus:ring-orange-200" 
                   onChange={e => setFormData({...formData, licenseUrl: e.target.value})} required />
          </div>

          <button type="submit" className="w-full bg-[#FF5C00] text-white py-5 rounded-[25px] font-black text-lg shadow-lg active:scale-95 transition-all mt-4">
            가입 신청하기 🚀
          </button>
        </form>

        <button 
          onClick={() => router.push('/login')}
          className="w-full text-sm font-bold text-gray-400 text-center pb-10"
        >
          이미 계정이 있으신가요? <span className="text-gray-600 underline">로그인</span>
        </button>
      </div>
    </div>
  );
}
EOF

npm run dev
mkdir -p app/signup
cat << 'EOF' > app/signup/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    businessName: '',
    phone: '',
    password: '',
    email: '',
    info: '',
    imageUrl: '',
    licenseUrl: ''
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Supabase Auth 계정 생성 (핸드폰 기반)
    const cleanPhone = formData.phone.replace(/-/g, '');
    const formattedPhone = `+82${cleanPhone.substring(1)}`;
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      phone: formattedPhone,
      password: formData.password,
    });

    if (authError) return alert('회원가입 실패: ' + authError.message);

    // 2. stores 테이블에 상세 정보 등록 (pending 상태로 저장)
    const { error: dbError } = await supabase.from('stores').insert([{
      name: formData.businessName,
      phone: cleanPhone,
      email: formData.email,
      info: formData.info,
      image_url: formData.imageUrl,
      business_license_url: formData.licenseUrl,
      owner_id: authData.user?.id,
      status: 'pending' 
    }]);

    if (dbError) {
      alert('데이터 저장 실패: ' + dbError.message);
    } else {
      alert('회원가입 신청이 완료되었습니다! 관리자 승인 후 로그인이 가능합니다. 🚀');
      router.push('/login');
    }
  };

  return (
    <div className="flex flex-col items-center min-h-[100dvh] bg-white px-6 py-10 overflow-y-auto">
      <div className="w-full h-1 bg-[#FFEDE0] absolute top-0 left-0"></div>
      
      <div className="w-full max-w-sm space-y-6 pt-4">
        <div className="text-center">
          <h2 className="text-2xl font-black text-[#FF5C00] mb-1">사장님 회원가입</h2>
          <p className="text-xs font-bold text-gray-600 mb-8 font-sans">구조대 합류를 위해 정보를 입력해주세요</p>
        </div>
        
        <form className="space-y-5" onSubmit={handleSignUp}>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 ml-4">필수 정보</label>
            <input placeholder="사업자명 (가게명)" className="w-full p-4 bg-[#F8F9FB] rounded-[20px] outline-none font-bold text-gray-700 shadow-sm focus:ring-1 focus:ring-orange-200" 
                   onChange={e => setFormData({...formData, businessName: e.target.value})} required />
            <input placeholder="핸드폰번호 (숫자만)" className="w-full p-4 bg-[#F8F9FB] rounded-[20px] outline-none font-bold text-gray-700 shadow-sm focus:ring-1 focus:ring-orange-200" 
                   onChange={e => setFormData({...formData, phone: e.target.value})} required />
            <input type="password" placeholder="비밀번호 설정" className="w-full p-4 bg-[#F8F9FB] rounded-[20px] outline-none font-bold text-gray-700 shadow-sm focus:ring-1 focus:ring-orange-200" 
                   onChange={e => setFormData({...formData, password: e.target.value})} required />
            <input type="email" placeholder="이메일 주소" className="w-full p-4 bg-[#F8F9FB] rounded-[20px] outline-none font-bold text-gray-700 shadow-sm focus:ring-1 focus:ring-orange-200" 
                   onChange={e => setFormData({...formData, email: e.target.value})} required />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 ml-4">가게 홍보 및 서류</label>
            <textarea placeholder="가게 소개 (지도에 표시됩니다)" className="w-full p-4 bg-[#F8F9FB] rounded-[20px] outline-none font-bold text-gray-700 shadow-sm resize-none focus:ring-1 focus:ring-orange-200" rows={2}
                      onChange={e => setFormData({...formData, info: e.target.value})} />
            <input placeholder="가게 대표 사진 URL" className="w-full p-4 bg-[#F8F9FB] rounded-[20px] outline-none font-bold text-gray-700 shadow-sm focus:ring-1 focus:ring-orange-200" 
                   onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
            <input placeholder="사업자등록증 이미지 URL" className="w-full p-4 bg-[#F8F9FB] rounded-[20px] outline-none font-bold text-gray-700 shadow-sm focus:ring-1 focus:ring-orange-200" 
                   onChange={e => setFormData({...formData, licenseUrl: e.target.value})} required />
          </div>

          <button type="submit" className="w-full bg-[#FF5C00] text-white py-5 rounded-[25px] font-black text-lg shadow-lg active:scale-95 transition-all mt-4">
            가입 신청하기 🚀
          </button>
        </form>

        <button 
          onClick={() => router.push('/login')}
          className="w-full text-sm font-bold text-gray-400 text-center pb-10"
        >
          이미 계정이 있으신가요? <span className="text-gray-600 underline">로그인</span>
        </button>
      </div>
    </div>
  );
}
EOF

npm run dev
npm install browser-image-compression
cat << 'EOF' > app/signup/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '', phone: '', password: '', email: '', info: ''
  });
  const [images, setImages] = useState<{ [key: string]: File | null }>({
    storeImage: null,
    licenseImage: null
  });

  // 이미지 압축 및 핸들러
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const options = {
      maxSizeMB: 0.5, // 최대 500KB로 압축
      maxWidthOrHeight: 1024,
      useWebWorker: true
    };

    try {
      const compressedFile = await imageCompression(file, options);
      setImages(prev => ({ ...prev, [type]: compressedFile }));
    } catch (error) {
      console.error("압축 에러:", error);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const cleanPhone = formData.phone.replace(/-/g, '');
      const formattedPhone = `+82${cleanPhone.substring(1)}`;
      
      // 1. Supabase Auth 가입
      const { data: authData, error: authError } = await supabase.auth.signUp({
        phone: formattedPhone,
        password: formData.password,
      });
      if (authError) throw authError;

      // 2. 이미지 업로드 (Storage)
      const uploadImage = async (file: File, path: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${authData.user?.id}/${path}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('store-files')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('store-files').getPublicUrl(filePath);
        return data.publicUrl;
      };

      let storeUrl = '';
      let licenseUrl = '';
      if (images.storeImage) storeUrl = await uploadImage(images.storeImage, 'store');
      if (images.licenseImage) licenseUrl = await uploadImage(images.licenseImage, 'license');

      // 3. DB 정보 저장
      const { error: dbError } = await supabase.from('stores').insert([{
        name: formData.businessName,
        phone: cleanPhone,
        email: formData.email,
        info: formData.info,
        image_url: storeUrl,
        business_license_url: licenseUrl,
        owner_id: authData.user?.id,
        status: 'pending'
      }]);

      if (dbError) throw dbError;

      alert('회원가입 신청 완료! 관리자 승인 후 연락드리겠습니다. 🚀');
      router.push('/login');
    } catch (err: any) {
      alert('오류 발생: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-[100dvh] bg-white px-6 py-10 overflow-y-auto font-sans">
      <div className="w-full h-2 bg-[#FFEDE0] absolute top-0 left-0"></div>
      <div className="w-full max-w-sm space-y-8 pt-4">
        <div className="text-center">
          <h2 className="text-2xl font-black text-[#FF5C00] mb-1">사장님 회원가입</h2>
          <p className="text-sm font-bold text-gray-600">구조대 합류를 위해 정보를 입력해주세요</p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSignUp}>
          <div className="space-y-3">
            <p className="text-[11px] font-black text-gray-400 ml-4 uppercase tracking-wider">필수 정보</p>
            <input placeholder="사업자명 (가게명)" className="w-full p-5 bg-[#F8F9FB] rounded-[25px] outline-none font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-[#FFEDE0]" 
                   onChange={e => setFormData({...formData, businessName: e.target.value})} required />
            <input placeholder="핸드폰번호 (숫자만)" className="w-full p-5 bg-[#F8F9FB] rounded-[25px] outline-none font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-[#FFEDE0]" 
                   onChange={e => setFormData({...formData, phone: e.target.value})} required />
            <input type="password" placeholder="비밀번호 설정" className="w-full p-5 bg-[#F8F9FB] rounded-[25px] outline-none font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-[#FFEDE0]" 
                   onChange={e => setFormData({...formData, password: e.target.value})} required />
            <input type="email" placeholder="이메일 주소" className="w-full p-5 bg-[#F8F9FB] rounded-[25px] outline-none font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-[#FFEDE0]" 
                   onChange={e => setFormData({...formData, email: e.target.value})} required />
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-black text-gray-400 ml-4 uppercase tracking-wider">가게 홍보 및 서류</p>
            <textarea placeholder="가게 소개 (지도 상세창 노출)" className="w-full p-5 bg-[#F8F9FB] rounded-[25px] outline-none font-bold text-gray-700 shadow-sm resize-none focus:ring-2 focus:ring-[#FFEDE0]" rows={2}
                      onChange={e => setFormData({...formData, info: e.target.value})} />
            
            <div className="grid grid-cols-1 gap-3">
              <label className="flex flex-col items-center justify-center w-full p-5 bg-[#F8F9FB] rounded-[25px] border-2 border-dashed border-gray-200 cursor-pointer hover:bg-[#FFEDE0] transition-all">
                <span className="text-sm font-bold text-gray-600">{images.storeImage ? '📸 사진 선택 완료' : '📸 가게 대표 사진 업로드'}</span>
                <input type="file" className="hidden" accept="image/*" onChange={e => handleImageChange(e, 'storeImage')} />
              </label>
              <label className="flex flex-col items-center justify-center w-full p-5 bg-[#F8F9FB] rounded-[25px] border-2 border-dashed border-gray-200 cursor-pointer hover:bg-[#FFEDE0] transition-all">
                <span className="text-sm font-bold text-gray-600">{images.licenseImage ? '📄 서류 선택 완료' : '📄 사업자등록증 업로드'}</span>
                <input type="file" className="hidden" accept="image/*" onChange={e => handleImageChange(e, 'licenseImage')} />
              </label>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#FF5C00] text-white py-5 rounded-[25px] font-black text-lg shadow-lg active:scale-95 transition-all">
            {loading ? '처리 중...' : '가입 신청하기 🚀'}
          </button>
        </form>

        <button onClick={() => router.push('/login')} className="w-full text-sm font-bold text-gray-600 text-center pb-10 underline underline-offset-4 decoration-gray-300">
          이미 계정이 있으신가요? 로그인
        </button>
      </div>
    </div>
  );
}
EOF

npm run dev
cat << 'EOF' > app/login/page.tsx
'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleKakaoLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) alert('카카오 로그인 실패: ' + error.message);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-white px-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <h2 className="text-3xl font-black text-[#FF5C00] italic mb-1">과일구조대</h2>
        <p className="text-sm font-bold text-gray-600 mb-10 font-sans">사장님 전용 관리 센터</p>

        <button 
          onClick={handleKakaoLogin}
          className="w-full bg-[#FEE500] text-[#191919] py-5 rounded-[25px] font-black text-lg shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <span className="text-xl">💬</span> 카카오로 시작하기
        </button>

        <p className="mt-8 text-xs font-bold text-gray-400 text-center leading-relaxed">
          카카오 로그인 후 사업자 정보를 등록하면<br/>대시보드를 이용하실 수 있습니다.
        </p>
      </div>
    </div>
  );
}
EOF

mkdir -p app/auth/callback
cat << 'EOF' > app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
EOF

cat << 'EOF' > app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // 이 유저의 ID(owner_id)로 등록된 가게가 있는지 확인
    const { data } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (data) {
      setStore(data);
    } else {
      // 가게 정보가 없으면 가입 신청 페이지로 이동
      router.push('/signup');
    }
    setLoading(false);
  };

  if (loading) return null;

  return (
    <div className="flex flex-col items-center min-h-screen bg-white">
      <div className="w-full h-2 bg-[#FFEDE0]"></div>
      <div className="w-full max-w-sm px-8 py-12 flex flex-col items-center">
        <h2 className="text-2xl font-black text-[#FF5C00] mb-6">가게 관리</h2>
        {store && (
          <div className="w-full space-y-4">
             <div className="bg-[#F8F9FB] p-6 rounded-[28px] text-center font-bold">
               <p className="text-[#FF5C00] text-xs mb-1">반갑습니다!</p>
               <h3 className="text-lg">{store.name} 사장님</h3>
             </div>
             {/* 기존 수정 로직들... */}
             <button onClick={() => router.push('/signup')} className="w-full text-gray-400 text-sm font-bold mt-10">정보 수정하기</button>
          </div>
        )}
      </div>
    </div>
  );
}
EOF

npm run dev
npm install @supabase/auth-helpers-nextjs @supabase/supabase-js
npm run dev
npm install @supabase/ssr @supabase/supabase-js
cat << 'EOF' > app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 에러 발생 시 로그인 페이지로 리다이렉트
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}
EOF

npm run dev
cat << 'EOF' > app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  
  // [수정] 실제 서버 주소로 고정
  const MY_DOMAIN = 'http://3.34.97.107:3000';

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 성공 시 실제 서버의 대시보드로 이동
      return NextResponse.redirect(`${MY_DOMAIN}${next}`);
    }
  }

  // 실패 시 실제 서버의 로그인 페이지로 이동
  return NextResponse.redirect(`${MY_DOMAIN}/login?error=auth_code_error`);
}
EOF

npm run dev
cat << 'EOF' > app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const MY_DOMAIN = 'http://3.34.97.107:3000';

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            // [수정] HTTP 환경에서도 쿠키가 생성되도록 옵션 조정
            cookieStore.set({ name, value, ...options, secure: false });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    // 인증 코드 교환 시도
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      console.log("✅ 로그인 성공!");
      return NextResponse.redirect(`${MY_DOMAIN}${next}`);
    } else {
      console.error("❌ 세션 교환 에러:", error.message);
    }
  }

  return NextResponse.redirect(`${MY_DOMAIN}/login?error=auth_code_error`);
}
EOF

npm run dev
cat << 'EOF' > app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const MY_DOMAIN = 'http://3.34.97.107:3000';

  console.log("🚀 [Auth Callback] 시작됨. 코드 존재 여부:", !!code);

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            // [핵심] HTTP 환경에서도 세션 쿠키가 유지되도록 설정
            cookieStore.set({ 
              name, 
              value, 
              ...options, 
              secure: false, // HTTP 허용
              sameSite: 'lax',
              path: '/'
            });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    // 인증 코드 -> 세션 교환
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      console.log("✅ [Auth Callback] 세션 교환 성공! 유저 ID:", data.user?.id);
      return NextResponse.redirect(`${MY_DOMAIN}${next}`);
    } else {
      console.error("❌ [Auth Callback] 세션 교환 실패 에러:", error.message);
    }
  } else {
    console.warn("⚠️ [Auth Callback] 인증 코드가 넘어오지 않았습니다.");
  }

  // 실패 시 리다이렉트
  return NextResponse.redirect(`${MY_DOMAIN}/login?error=auth_code_error`);
}
EOF

npm run dev
cat << 'EOF' > app/login/page.tsx
'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleKakaoLogin = async () => {
    // [수정] 도메인을 직접 쓰지 않고 경로만 지정합니다.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) alert('카카오 로그인 실패: ' + error.message);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-white px-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <h2 className="text-3xl font-black text-[#FF5C00] italic mb-1">과일구조대</h2>
        <p className="text-sm font-bold text-gray-600 mb-10">사장님 전용 관리 센터</p>

        <button 
          onClick={handleKakaoLogin}
          className="w-full bg-[#FEE500] text-[#191919] py-5 rounded-[25px] font-black text-lg shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          💬 카카오로 시작하기
        </button>

        <p className="mt-8 text-[11px] font-bold text-gray-400 text-center leading-relaxed">
          카카오 로그인 후 사업자 정보를 등록하면<br/>대시보드를 이용하실 수 있습니다.
        </p>
      </div>
    </div>
  );
}
EOF

cat << 'EOF' > app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  const MY_DOMAIN = 'http://3.34.97.107:3000';

  console.log("🚀 [Auth Callback] 감지된 전체 URL:", request.url);

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options, secure: false, sameSite: 'lax', path: '/' });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      console.log("✅ [Auth Callback] 세션 교환 성공!");
      return NextResponse.redirect(`${MY_DOMAIN}${next}`);
    }
    console.error("❌ [Auth Callback] 세션 교환 에러:", error.message);
  }

  return NextResponse.redirect(`${MY_DOMAIN}/login?error=auth_code_error`);
}
EOF

npm run dev
cat utils/supabase.ts
cat << 'EOF' > utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
EOF

npm run dev
cat << 'EOF' > .env.local
NEXT_PUBLIC_SUPABASE_URL=https://utcqwesokcvlvwahomjj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3F3ZXNva2N2bHZ3YWhvbWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTI0NTY3ODgsImV4cCI6MjAyODAzMjc4OH0.XXXXX (여기에 안토니오님의 실제 Anon Key 전체를 붙여넣으세요)
EOF

npm run dev
cat << 'EOF' > .env.local
NEXT_PUBLIC_SUPABASE_URL=https://utcqwesokcvlvwahomjj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3F3ZXNva2N2bHZ3YWhvbWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyODAxMjUsImV4cCI6MjA5MDg1NjEyNX0.UhyXF9OHYwEKQFDzog9E7vgggPJOHBHpjvXzgoowipI
EOF

npm run dev
cat << 'EOF' > app/login/page.tsx
'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleKakaoLogin = async () => {
    // [최후의 수단] 주소를 하드코딩하여 리다이렉트 위치를 고정합니다.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: 'http://3.34.97.107:3000/auth/callback',
      },
    });
    if (error) alert('카카오 로그인 실패: ' + error.message);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-white px-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <h2 className="text-3xl font-black text-[#FF5C00] italic mb-1 text-center">과일구조대</h2>
        <p className="text-sm font-bold text-gray-600 mb-10 text-center font-sans">사장님 전용 관리 센터</p>

        <button 
          onClick={handleKakaoLogin}
          className="w-full bg-[#FEE500] text-[#191919] py-5 rounded-[25px] font-black text-lg shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          💬 카카오로 시작하기
        </button>

        <p className="mt-8 text-[11px] font-bold text-gray-400 text-center leading-relaxed font-sans">
          카카오 로그인 후 사업자 정보를 등록하면<br/>대시보드를 이용하실 수 있습니다.
        </p>
      </div>
    </div>
  );
}
EOF

npm run dev
# 기존 내용에 추가하거나 아래 명령어로 덮어쓰기 (키값은 아까 넣으신 것 그대로 유지)
cat << 'EOF' > .env.local
NEXT_PUBLIC_SUPABASE_URL=https://utcqwesokcvlvwahomjj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3F3ZXNva2N2bHZ3YWhvbWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyODAxMjUsImV4cCI6MjA5MDg1NjEyNX0.UhyXF9OHYwEKQFDzog9E7vgggPJOHBHpjvXzgoowipI
NEXT_PUBLIC_SITE_URL=http://3.34.97.107:3000
EOF

cat << 'EOF' > app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  
  // 환경변수에 설정한 주소를 우선 사용, 없으면 직접 입력
  const MY_DOMAIN = process.env.NEXT_PUBLIC_SITE_URL || 'http://3.34.97.107:3000';

  console.log("🚀 [Auth Callback] 감지된 URL:", request.url);
  console.log("🚀 [Auth Callback] 이동할 도메인:", MY_DOMAIN);

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options, secure: false, sameSite: 'lax', path: '/' });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      console.log("✅ [Auth Callback] 세션 교환 성공!");
      return NextResponse.redirect(`${MY_DOMAIN}${next}`);
    }
    console.error("❌ [Auth Callback] 세션 교환 에러:", error.message);
  }

  // 실패 시 리다이렉트 (에러 메시지를 붙여서 보냄)
  return NextResponse.redirect(`${MY_DOMAIN}/login?error=auth_code_error`);
}
EOF

npm run dev
cat << 'EOF' > app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  // [강제] URL에 code가 있는지 다시 한번 파싱
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  const MY_DOMAIN = 'http://3.34.97.107:3000';

  console.log("🚀 [Auth Callback] 들어온 URL:", request.url);

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options, secure: false, sameSite: 'lax', path: '/' });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      console.log("✅ [Auth Callback] 성공! 대시보드로 이동합니다.");
      return NextResponse.redirect(`${MY_DOMAIN}${next}`);
    }
    console.error("❌ [Auth Callback] 에러:", error.message);
  }

  // 여전히 코드가 없다면 주소 문제임
  return NextResponse.redirect(`${MY_DOMAIN}/login?error=no_code_in_url`);
}
EOF

npm run dev
cat << 'EOF' > app/login/page.tsx
'use client';

import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const handleKakaoLogin = async () => {
    // 현재 브라우저 주소창에 찍힌 도메인을 기준으로 리다이렉트 주소를 생성
    const currentOrigin = window.location.origin;
    console.log("현재 접속 도메인:", currentOrigin);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        // 이 주소가 카카오를 거쳐 다시 우리 서버로 돌아올 주소입니다.
        redirectTo: `${currentOrigin}/auth/callback`,
      },
    });
    if (error) alert('카카오 로그인 실패: ' + error.message);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-white px-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <h2 className="text-3xl font-black text-[#FF5C00] italic mb-1">과일구조대</h2>
        <p className="text-sm font-bold text-gray-600 mb-10">사장님 전용 관리 센터</p>
        <button 
          onClick={handleKakaoLogin}
          className="w-full bg-[#FEE500] text-[#191919] py-5 rounded-[25px] font-black text-lg shadow-sm flex items-center justify-center gap-2"
        >
          💬 카카오로 시작하기
        </button>
      </div>
    </div>
  );
}
EOF

npm run dev
cat << 'EOF' > app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // [수정] 들어온 URL이 localhost라면 강제로 서버 IP로 변경하여 파싱합니다.
  const rawUrl = request.url.replace('http://localhost:3000', 'http://3.34.97.107:3000');
  const requestUrl = new URL(rawUrl);
  
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  const MY_DOMAIN = 'http://3.34.97.107:3000';

  console.log("🚀 [Auth Callback] 최종 처리 URL:", rawUrl);

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options, secure: false, sameSite: 'lax', path: '/' });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      console.log("✅ [Auth Callback] 세션 교환 성공!");
      return NextResponse.redirect(`${MY_DOMAIN}${next}`);
    }
    console.error("❌ [Auth Callback] 에러:", error.message);
  }

  return NextResponse.redirect(`${MY_DOMAIN}/login?error=no_code_in_url`);
}
EOF

npm run dev
cat << 'EOF' > app/login/page.tsx
'use client';

import { supabase } from '@/utils/supabase';

export default function LoginPage() {
  const handleKakaoLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        // [중요] 인증 완료 후 코드를 들고 돌아올 우리 서버 주소입니다.
        redirectTo: 'http://3.34.97.107:3000/auth/callback',
      },
    });
    if (error) alert('로그인 에러: ' + error.message);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <h2 className="text-3xl font-black text-[#FF5C00] mb-8 italic">과일구조대</h2>
      <button 
        onClick={handleKakaoLogin}
        className="bg-[#FEE500] text-[#191919] px-10 py-4 rounded-full font-bold shadow-md active:scale-95 transition-all"
      >
        💬 카카오로 1초 로그인
      </button>
    </div>
  );
}
EOF

npm run dev
cat << 'EOF' > app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error_description = requestUrl.searchParams.get('error_description');
  
  console.log("📍 [Auth Callback] 들어온 전체 쿼리:", requestUrl.search);
  
  if (error_description) {
    console.error("❌ [Auth Callback] 카카오/Supabase 에러:", error_description);
  }

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options, secure: false, sameSite: 'lax', path: '/' });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      console.log("✅ [Auth Callback] 로그인 성공!");
      return NextResponse.redirect('http://3.34.97.107:3000/dashboard');
    }
    console.error("❌ [Auth Callback] 세션 교환 실패:", error.message);
  }

  return NextResponse.redirect('http://3.34.97.107:3000/login?error=no_code_in_url');
}
EOF

npm run dev
cat << 'EOF' > app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 로그인 처리
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert('로그인 실패: ' + error.message);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  // 회원가입 처리 (임시)
  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert('회원가입 실패: ' + error.message);
    } else {
      alert('가입 확인 이메일을 보냈습니다. 메일함을 확인해주세요!');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gray-50 px-6">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-[#FF5C00] italic mb-1">과일구조대</h2>
          <p className="text-sm font-bold text-gray-500">사장님 전용 관리 센터</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">이메일 주소</label>
            <input 
              type="email" 
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5C00] transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">비밀번호</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5C00] transition-all"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF5C00] text-white py-4 rounded-xl font-black text-lg shadow-md active:scale-95 transition-all disabled:bg-gray-300"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-6 flex justify-center gap-4 text-xs font-bold text-gray-400">
          <button onClick={handleSignUp} className="hover:text-gray-600">회원가입</button>
          <span>|</span>
          <button className="hover:text-gray-600">비밀번호 찾기</button>
        </div>
      </div>
    </div>
  );
}
EOF

npm run dev
cat << 'EOF' > app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('로그인 실패: ' + error.message);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      alert('회원가입 실패: ' + error.message);
    } else if (data.user && data.session) {
      alert('회원가입 성공! 바로 로그인되었습니다.');
      router.push('/dashboard');
    } else if (data.user) {
      alert('가입은 되었으나 이메일 인증이 필요합니다. (Supabase 설정을 확인하세요)');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gray-50 px-6">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-[#FF5C00] italic mb-1">과일구조대</h2>
          <p className="text-sm font-bold text-gray-500">사장님 전용 관리 센터</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" 
            placeholder="이메일 주소"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5C00]"
            required
          />
          <input 
            type="password" 
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5C00]"
            required
          />
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF5C00] text-white py-4 rounded-xl font-black text-lg shadow-md active:scale-95 disabled:bg-gray-300"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <button 
          onClick={handleSignUp}
          className="w-full mt-4 text-sm font-bold text-gray-400 hover:text-[#FF5C00] transition-colors"
        >
          처음이신가요? 1초만에 회원가입
        </button>
      </div>
    </div>
  );
}
EOF

npm run dev

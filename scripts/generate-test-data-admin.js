const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// .env.local 파일 로드
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) envVars[key.trim()] = value.trim();
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
// Service Role 키 (전체 권한)
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3F3ZXNva2N2bHZ3YWhvbWpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI4MDEyNSwiZXhwIjoyMDkwODU2MTI1fQ.SPPTzp_1y7WJrGKdS__Zl85uYemiLBpwiImtYzNIPLQ';

if (!supabaseUrl) {
  console.error('❌ Supabase URL이 없습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// 테스트 설정
const USERS_COUNT = 5000;
const SHOPS_COUNT = 300;
const PRODUCTS_PER_SHOP = 15;

const CATEGORIES = ['과일', '야채', '축산', '수산', '공산품', '베이커리', '식당', '기타'];
const PRODUCTS = {
  과일: ['딸기', '포도', '귀여', '블루베리', '복숭아', '수박'],
  야채: ['당근', '양배추', '상추', '파프리카', '오이', '토마토'],
  축산: ['소고기', '돼지고기', '닭고기', '계란'],
  수산: ['연어', '고등어', '새우', '홍합'],
  공산품: ['쌀', '밀가루', '기름', '소금'],
  베이커리: ['식빵', '크림빵', '초콜릿빵'],
  식당: ['김밥', '우동', '라면'],
};

// 전국 주소 데이터
const CITY_REGIONS = [
  { city: '서울시', districts: ['강남구', '강북구', '종로구', '중구', '송파구', '강서구', '마포구', '영등포구'] },
  { city: '부산시', districts: ['해운대구', '중구', '서구', '사상구', '북구', '동래구'] },
  { city: '대구시', districts: ['중구', '동구', '서구', '남구', '북구', '달서구'] },
  { city: '인천시', districts: ['중구', '동구', '남동구', '연수구', '남구', '부평구'] },
  { city: '광주시', districts: ['동구', '서구', '남구', '북구', '광산구'] },
  { city: '대전시', districts: ['동구', '중구', '서구', '유성구', '대덕구'] },
  { city: '울산시', districts: ['중구', '남구', '동구', '북구', '울주군'] },
  { city: '경기도', districts: ['수원시', '안산시', '고양시', '용인시', '성남시', '부천시', '안양시', '화성시', '평택시'] },
  { city: '강원도', districts: ['춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시'] },
  { city: '충청북도', districts: ['청주시', '충주시', '제천시', '보은군'] },
  { city: '충청남도', districts: ['천안시', '공주시', '보령시', '아산시', '예산군'] },
  { city: '전라북도', districts: ['전주시', '익산시', '군산시', '정읍시'] },
  { city: '전라남도', districts: ['목포시', '여수시', '순천시', '나주시', '광양시'] },
  { city: '경상북도', districts: ['포항시', '경주시', '김천시', '안동시', '구미시'] },
  { city: '경상남도', districts: ['창원시', '진주시', '통영시', '사천시', '거제시'] },
];

const STREET_NAMES = [
  '중앙로', '평화로', '신문로', '학동로', '논현로', '테헤란로', '선릉로', '봉은사로',
  '강남대로', '삼성로', '언주로', '남부순환로', '동호로', '여의나루로', '63빌딩길',
  '한강로', '남산대로', '청계천로', '종로', '사직로', '효자로', '세종로', '소공로'
];

function getRandomAddress(i) {
  const regionIndex = i % CITY_REGIONS.length;
  const region = CITY_REGIONS[regionIndex];
  const district = region.districts[i % region.districts.length];
  const street = STREET_NAMES[i % STREET_NAMES.length];
  const buildingNum = Math.floor((i / CITY_REGIONS.length) % 999) + 1;
  return `${region.city} ${district} ${street} ${buildingNum}`;
}

function generatePhone() {
  return `010${Math.floor(Math.random() * 90000000 + 10000000)}`;
}

// 지역별 좌표 (도시 중심)
const REGION_COORDS = {
  '서울시': { lat: 37.5665, lng: 126.978, spread: 0.2 },
  '부산시': { lat: 35.1796, lng: 129.0756, spread: 0.2 },
  '대구시': { lat: 35.8714, lng: 128.6014, spread: 0.15 },
  '인천시': { lat: 37.4562, lng: 126.7052, spread: 0.15 },
  '광주시': { lat: 35.1595, lng: 126.8526, spread: 0.15 },
  '대전시': { lat: 36.3504, lng: 127.3845, spread: 0.15 },
  '울산시': { lat: 35.5394, lng: 129.3114, spread: 0.15 },
  '경기도': { lat: 37.2756, lng: 127.009, spread: 0.4 },
  '강원도': { lat: 37.8228, lng: 128.1555, spread: 0.4 },
  '충청북도': { lat: 36.6357, lng: 127.4917, spread: 0.3 },
  '충청남도': { lat: 36.8081, lng: 127.1092, spread: 0.3 },
  '전라북도': { lat: 35.7175, lng: 127.1535, spread: 0.3 },
  '전라남도': { lat: 34.8118, lng: 127.1089, spread: 0.3 },
  '경상북도': { lat: 36.5694, lng: 129.1099, spread: 0.3 },
  '경상남도': { lat: 35.2383, lng: 128.6929, spread: 0.3 },
};

function generateLocation(shopIndex) {
  const regionIndex = shopIndex % CITY_REGIONS.length;
  const region = CITY_REGIONS[regionIndex];
  const coords = REGION_COORDS[region.city];

  const lat = coords.lat + (Math.random() - 0.5) * coords.spread;
  const lng = coords.lng + (Math.random() - 0.5) * coords.spread;
  return { lat, lng };
}

function generatePrice() {
  return Math.floor(Math.random() * 30000 + 5000);
}

async function generateShops() {
  console.log(`📌 ${SHOPS_COUNT}개 가게 생성 중 (Service Role)...`);
  const shops = [];

  for (let i = 0; i < SHOPS_COUNT; i++) {
    const location = generateLocation(i);
    const regionIndex = i % CITY_REGIONS.length;
    const region = CITY_REGIONS[regionIndex];
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const district = region.districts[i % region.districts.length];
    const street = STREET_NAMES[i % STREET_NAMES.length];
    const buildingNum = Math.floor((i / CITY_REGIONS.length) % 999) + 1;
    const address = `${region.city} ${district} ${street} ${buildingNum}`;

    shops.push({
      id: crypto.randomUUID(),
      owner_id: crypto.randomUUID(),
      shop_name: `${address.split(' ')[1]} ${category} 판매점 ${i + 1}`,
      category: category,
      latitude: location.lat,
      longitude: location.lng,
      address: address,
      phone: generatePhone(),
      description: `신선한 ${category}를 판매합니다. 매일 새로운 상품!`,
      is_active: true,
      created_at: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  const { data, error } = await supabase.from('shops').insert(shops).select('id, category');
  if (error) {
    console.error('❌ 가게 생성 실패:', error.message);
    return [];
  }
  console.log(`✓ ${SHOPS_COUNT}개 가게 생성 완료`);
  return data || [];
}

async function generateProducts(shops) {
  console.log(`📌 상품 생성 중 (가게당 ${PRODUCTS_PER_SHOP}개)...`);
  const products = [];

  for (const shop of shops) {
    const categoryProducts = PRODUCTS[shop.category] || ['상품'];

    for (let p = 0; p < PRODUCTS_PER_SHOP; p++) {
      const product = categoryProducts[Math.floor(Math.random() * categoryProducts.length)];
      const originalPrice = generatePrice();
      const discountRate = Math.floor(Math.random() * 50) + 20;
      const rescuePrice = Math.floor(originalPrice * (1 - discountRate / 100));

      products.push({
        id: crypto.randomUUID(),
        shop_id: shop.id,
        product_name: `${product} ${Math.floor(Math.random() * 100)}`,
        category: shop.category,
        original_price: originalPrice,
        rescue_price: rescuePrice,
        discount_rate: discountRate,
        stock_quantity: Math.floor(Math.random() * 50) + 5,
        expire_datetime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        is_rescued: false,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Batch insert (1000개씩)
  for (let i = 0; i < products.length; i += 1000) {
    const batch = products.slice(i, i + 1000);
    const { error } = await supabase.from('rescue_products').insert(batch);
    if (error) {
      console.error(`⚠️  상품 ${i}~${i + 1000} 생성 중 오류:`, error.message.substring(0, 80));
    } else {
      console.log(`✓ ${Math.min(i + 1000, products.length)}/${products.length} 상품 생성됨`);
    }
  }
  return products;
}

async function main() {
  console.log('\n🚀 대규모 테스트 데이터 생성 시작 (Service Role 인증)...\n');
  console.log(`📊 생성 계획:`);
  console.log(`   - 회원: 5000명 (이미 생성됨)`);
  console.log(`   - 가게: ${SHOPS_COUNT}개`);
  console.log(`   - 상품: ${SHOPS_COUNT * PRODUCTS_PER_SHOP}개\n`);

  const startTime = Date.now();

  try {
    const shops = await generateShops();
    if (shops.length === 0) {
      console.error('❌ 가게 생성 실패. Service Role 키 또는 권한 문제.');
      process.exit(1);
    }

    const products = await generateProducts(shops);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ 테스트 데이터 생성 완료!\n');
    console.log(`📈 최종 결과:`);
    console.log(`   - 회원: 5000명 (이전에 생성됨)`);
    console.log(`   - 가게: ${shops.length}개`);
    console.log(`   - 상품: ${products.length}개`);
    console.log(`   - 생성 시간: ${elapsed}초\n`);

    console.log(`📊 총 데이터 통계:`);
    console.log(`   - 전체 회원: 5000명`);
    console.log(`   - 전체 가게: ${shops.length}개`);
    console.log(`   - 전체 상품: ${products.length}개`);
    console.log(`   - 예상 예약 데이터: ~1500건\n`);

  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

main();

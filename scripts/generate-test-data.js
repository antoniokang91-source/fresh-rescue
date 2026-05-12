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
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL 또는 Key가 없습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

function generatePhone() {
  return `010${Math.floor(Math.random() * 90000000 + 10000000)}`;
}

function generateLocation() {
  const lat = 37.5 + (Math.random() - 0.5) * 0.5;
  const lng = 127.0 + (Math.random() - 0.5) * 0.5;
  return { lat, lng };
}

function generatePrice() {
  return Math.floor(Math.random() * 30000 + 5000);
}

async function generateUsers() {
  console.log(`📌 ${USERS_COUNT}명의 회원 생성 중...`);
  const users = [];

  for (let i = 0; i < USERS_COUNT; i++) {
    users.push({
      id: crypto.randomUUID(),
      nickname: `사용자${i + 1}`,
      phone: generatePhone(),
      role: 'user',
      is_registered: true,
      marketing_agree: Math.random() > 0.3,
      marketing_agreed_at: new Date().toISOString(),
      created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Batch insert (1000개씩)
  const createdUsers = [];
  for (let i = 0; i < users.length; i += 1000) {
    const batch = users.slice(i, i + 1000);
    const { data, error } = await supabase.from('members').insert(batch).select('id');
    if (error) {
      console.error(`❌ 회원 ${i}~${i + 1000} 생성 실패:`, error.message);
      continue;
    }
    if (data) createdUsers.push(...data);
    console.log(`✓ ${Math.min(i + 1000, users.length)}/${USERS_COUNT} 회원 생성됨`);
  }
  return createdUsers;
}

async function generateShops() {
  console.log(`📌 ${SHOPS_COUNT}개 가게 생성 중...`);
  const shops = [];

  for (let i = 0; i < SHOPS_COUNT; i++) {
    const location = generateLocation();
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

    shops.push({
      id: crypto.randomUUID(),
      owner_id: crypto.randomUUID(),
      shop_name: `${category} 판매점 ${i + 1}`,
      category: category,
      latitude: location.lat,
      longitude: location.lng,
      address: `서울시 강남구 테스트로 ${i + 1}`,
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
  console.log(`✓ ${SHOPS_COUNT}개 가게 생성됨`);
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
  console.log('\n🚀 대규모 테스트 데이터 생성 시작...\n');
  console.log(`📊 생성 계획:`);
  console.log(`   - 회원: ${USERS_COUNT}명`);
  console.log(`   - 가게: ${SHOPS_COUNT}개`);
  console.log(`   - 상품: ${SHOPS_COUNT * PRODUCTS_PER_SHOP}개\n`);

  const startTime = Date.now();

  try {
    const users = await generateUsers();
    console.log(`✓ ${users.length}명의 회원 생성 완료\n`);

    const shops = await generateShops();
    console.log(`✓ ${shops.length}개 가게 생성 완료\n`);

    const products = await generateProducts(shops);
    console.log(`✓ ${products.length}개 상품 생성 완료\n`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('✅ 테스트 데이터 생성 완료!\n');
    console.log(`📈 최종 결과:`);
    console.log(`   - 회원: ${users.length}명`);
    console.log(`   - 가게: ${shops.length}개`);
    console.log(`   - 상품: ${products.length}개`);
    console.log(`   - 생성 시간: ${elapsed}초\n`);

  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

main();

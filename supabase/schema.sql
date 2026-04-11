-- 1. 예전 profiles와 관련된 정책이나 뷰가 있다면 정리
DROP VIEW IF EXISTS public.marketing_stats;

-- 2. 마감구조대원 (rescuers) 테이블 생성/수정
-- 기존에 rescuers 테이블이 있어도 컬럼을 일치시킵니다.
CREATE TABLE IF NOT EXISTS public.rescuers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE, -- 핸드폰 번호 기반 가입을 위해 추가
  session_token VARCHAR(255),
  rescue_count INT DEFAULT 0,
  is_registered BOOLEAN DEFAULT true,
  marketing_agree BOOLEAN DEFAULT false,
  marketing_agreed_at TIMESTAMP WITH TIME ZONE,
  role VARCHAR(20) DEFAULT 'user',        -- 'user' | 'seller' | 'admin'
  seller_status VARCHAR(20),              -- 'pending' | 'approved' | 'suspended'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 기존 테이블에 컬럼이 없는 경우 추가 (이미 실행된 경우 안전하게 처리)
ALTER TABLE public.rescuers ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
ALTER TABLE public.rescuers ADD COLUMN IF NOT EXISTS seller_status VARCHAR(20);
ALTER TABLE public.rescuers ADD COLUMN IF NOT EXISTS marketing_agree BOOLEAN DEFAULT false;
ALTER TABLE public.rescuers ADD COLUMN IF NOT EXISTS marketing_agreed_at TIMESTAMP WITH TIME ZONE;

-- 3. 가게 (shops) 테이블 - 마감구조대 규격
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID, -- 나중에 users 테이블과 연결
  shop_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. 마감 임박 구조 상품 (rescue_products)
CREATE TABLE IF NOT EXISTS public.rescue_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  product_name VARCHAR(100) NOT NULL,
  original_price INT NOT NULL,
  rescue_price INT NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  expire_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, rescued, expired
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. 보안 정책 (RLS) 강제 초기화 및 설정
ALTER TABLE public.rescuers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescue_products ENABLE ROW LEVEL SECURITY;

-- rescuers 가입 허용 정책 (INSERT)
DROP POLICY IF EXISTS "allow_anon_insert" ON public.rescuers;
CREATE POLICY "allow_anon_insert" ON public.rescuers FOR INSERT WITH CHECK (true);

-- rescuers 본인 정보 수정 허용 (UPDATE)
DROP POLICY IF EXISTS "allow_owner_update" ON public.rescuers;
CREATE POLICY "allow_owner_update" ON public.rescuers FOR UPDATE USING (auth.uid() = id);

-- 모든 테이블 조회 허용 (공개 서비스용)
DROP POLICY IF EXISTS "public_select" ON public.rescuers;
CREATE POLICY "public_select" ON public.rescuers FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_shop_select" ON public.shops;
CREATE POLICY "public_shop_select" ON public.shops FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_product_select" ON public.rescue_products;
CREATE POLICY "public_product_select" ON public.rescue_products FOR SELECT USING (true);

-- 1. 가입 시 profiles에 강제로 집어넣으려던 유령 트리거 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS tr_profiles_on_signup ON auth.users;
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;

-- 2. 해당 트리거가 실행하던 낡은 함수 삭제
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- 3. (혹시나 해서 추가) rescuers 테이블에 대한 RLS 권한을 다시 한번 완전히 개방
ALTER TABLE public.rescuers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert for signup" ON public.rescuers;
CREATE POLICY "Anyone can insert for signup" ON public.rescuers FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seller Dashboard — shops 테이블 컬럼 추가 및 RLS 정책
-- ─────────────────────────────────────────────────────────────────────────────

-- shops 추가 컬럼
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS owner_name VARCHAR(50);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS business_number VARCHAR(20);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS business_registration_url TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS shop_image_url TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS road_address VARCHAR(255);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS address_detail VARCHAR(100);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- latitude / longitude nullable로 변경 (주소 입력 후 지오코딩 실패 케이스 허용)
ALTER TABLE public.shops ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE public.shops ALTER COLUMN longitude DROP NOT NULL;

-- category 기본값 설정
ALTER TABLE public.shops ALTER COLUMN category SET DEFAULT '기타';

-- shop_name 기본값 (임시 방어용)
ALTER TABLE public.shops ALTER COLUMN shop_name SET DEFAULT '';

-- shops RLS — 사장님 본인 INSERT / UPDATE 허용
DROP POLICY IF EXISTS "owner_insert_shop" ON public.shops;
CREATE POLICY "owner_insert_shop" ON public.shops FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "owner_update_shop" ON public.shops;
CREATE POLICY "owner_update_shop" ON public.shops FOR UPDATE USING (auth.uid() = owner_id);

-- rescue_products RLS — 해당 가게 사장님이 전체 관리 가능
DROP POLICY IF EXISTS "shop_owner_products" ON public.rescue_products;
CREATE POLICY "shop_owner_products" ON public.rescue_products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.shops WHERE shops.id = rescue_products.shop_id AND shops.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "shop_owner_insert_products" ON public.rescue_products;
CREATE POLICY "shop_owner_insert_products" ON public.rescue_products FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.shops WHERE shops.id = rescue_products.shop_id AND shops.owner_id = auth.uid())
);

-- NOTE: Supabase Storage 버킷 3개를 대시보드에서 수동 생성해야 합니다.
--   - shop-images     (가게 대표 사진)
--   - business-docs   (사업자등록증 PDF/이미지)
--   - product-images  (상품 사진)
-- 각 버킷은 Public 접근 허용으로 설정하거나, 별도 Storage 정책을 추가하세요.
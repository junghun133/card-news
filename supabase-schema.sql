-- ============================================
-- 카드뉴스 앱 Supabase 스키마 (단일 어드민 사용자)
-- Supabase Dashboard > SQL Editor 에서 실행
-- ============================================

-- 1. api_keys: API 키 저장 (1행만 사용)
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  serper_api_key TEXT DEFAULT '',
  openai_api_key TEXT DEFAULT '',
  unsplash_access_key TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 행 삽입
INSERT INTO api_keys (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 2. card_news_projects: 카드뉴스 프로젝트 저장
CREATE TABLE IF NOT EXISTS card_news_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT '',
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_layout TEXT DEFAULT 'text-emphasis',
  thumbnail_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_card_news_projects_updated_at ON card_news_projects(updated_at DESC);

-- 3. RLS 비활성화 (단일 사용자 + anon key 사용)
-- 필요 시 service_role key로 접근하거나, anon key에 대해 전체 허용
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_news_projects ENABLE ROW LEVEL SECURITY;

-- anon 역할에 전체 접근 허용
CREATE POLICY "api_keys_all" ON api_keys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "card_news_projects_all" ON card_news_projects FOR ALL USING (true) WITH CHECK (true);

-- 4. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_news_projects_updated_at
  BEFORE UPDATE ON card_news_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. news_searches: 뉴스 검색 기록 저장
CREATE TABLE IF NOT EXISTS news_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT DEFAULT 'all',
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_searches_created_at ON news_searches(created_at DESC);

ALTER TABLE news_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news_searches_all" ON news_searches FOR ALL USING (true) WITH CHECK (true);

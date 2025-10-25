-- Seed Retail Performance Data
-- Creates 25 retail stores with historical performance across varying quantities
-- This enables percentile ranking to work properly

BEGIN TRANSACTION;

-- ============================================================================
-- 1. CREATE RETAIL STORES (25 stores)
-- ============================================================================

-- HIGH PERFORMERS (5 stores) - Base rate 4.5-6%
INSERT INTO retail_stores (id, store_number, name, region, city, state, size_category, is_active, created_at)
VALUES
  ('store_high_01', 'STORE001', 'Premium Downtown', 'Northeast', 'Premium', 'NY', 'high', 1, datetime('now')),
  ('store_high_02', 'STORE002', 'Flagship Manhattan', 'Northeast', 'Flagship', 'NY', 'high', 1, datetime('now')),
  ('store_high_03', 'STORE003', 'Beverly Hills Store', 'West', 'Beverly', 'CA', 'high', 1, datetime('now')),
  ('store_high_04', 'STORE004', 'Chicago Gold Coast', 'Midwest', 'Chicago', 'IL', 'high', 1, datetime('now')),
  ('store_high_05', 'STORE005', 'Miami Beach', 'South', 'Miami', 'FL', 'high', 1, datetime('now'));

-- MEDIUM PERFORMERS (12 stores) - Base rate 2.5-4%
INSERT INTO retail_stores (id, store_number, name, region, city, state, size_category, is_active, created_at)
VALUES
  ('store_med_01', 'STORE006', 'Suburban Mall A', 'Northeast', 'Suburban', 'NJ', 'medium', 1, datetime('now')),
  ('store_med_02', 'STORE007', 'Suburban Mall B', 'West', 'Suburban', 'CA', 'medium', 1, datetime('now')),
  ('store_med_03', 'STORE008', 'Austin Central', 'South', 'Austin', 'TX', 'medium', 1, datetime('now')),
  ('store_med_04', 'STORE009', 'Denver Plaza', 'West', 'Denver', 'CO', 'medium', 1, datetime('now')),
  ('store_med_05', 'STORE010', 'Atlanta Midtown', 'South', 'Atlanta', 'GA', 'medium', 1, datetime('now')),
  ('store_med_06', 'STORE011', 'Seattle Downtown', 'West', 'Seattle', 'WA', 'medium', 1, datetime('now')),
  ('store_med_07', 'STORE012', 'Boston Commons', 'Northeast', 'Boston', 'MA', 'medium', 1, datetime('now')),
  ('store_med_08', 'STORE013', 'Portland Strip', 'West', 'Portland', 'OR', 'medium', 1, datetime('now')),
  ('store_med_09', 'STORE014', 'Philadelphia Center', 'Northeast', 'Philadelphia', 'PA', 'medium', 1, datetime('now')),
  ('store_med_10', 'STORE015', 'Minneapolis Lake', 'Midwest', 'Minneapolis', 'MN', 'medium', 1, datetime('now')),
  ('store_med_11', 'STORE016', 'Phoenix Desert', 'West', 'Phoenix', 'AZ', 'medium', 1, datetime('now')),
  ('store_med_12', 'STORE017', 'San Diego Coast', 'West', 'San Diego', 'CA', 'medium', 1, datetime('now'));

-- LOW PERFORMERS (8 stores) - Base rate 1.5-2.5%
INSERT INTO retail_stores (id, store_number, name, region, city, state, size_category, is_active, created_at)
VALUES
  ('store_low_01', 'STORE018', 'Rural Location A', 'Midwest', 'Rural', 'IA', 'low', 1, datetime('now')),
  ('store_low_02', 'STORE019', 'Rural Location B', 'South', 'Rural', 'MS', 'low', 1, datetime('now')),
  ('store_low_03', 'STORE020', 'Struggling Mall C', 'Midwest', 'Struggling', 'OH', 'low', 1, datetime('now')),
  ('store_low_04', 'STORE021', 'Outlet Store D', 'South', 'Outlet', 'AL', 'low', 1, datetime('now')),
  ('store_low_05', 'STORE022', 'Small Town E', 'Midwest', 'Small', 'NE', 'low', 1, datetime('now')),
  ('store_low_06', 'STORE023', 'Strip Mall F', 'South', 'Strip', 'AR', 'low', 1, datetime('now')),
  ('store_low_07', 'STORE024', 'Budget Plaza G', 'West', 'Budget', 'NV', 'low', 1, datetime('now')),
  ('store_low_08', 'STORE025', 'Economy Store H', 'Midwest', 'Economy', 'KS', 'low', 1, datetime('now'));

COMMIT;

-- Summary
SELECT '✅ Created ' || COUNT(*) || ' retail stores' as status FROM retail_stores;
SELECT
  size_category as tier,
  COUNT(*) as count,
  GROUP_CONCAT(name, ', ') as stores
FROM retail_stores
GROUP BY size_category
ORDER BY
  CASE size_category
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END;

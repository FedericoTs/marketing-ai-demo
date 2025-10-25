-- Populate Historical Campaigns with Realistic Conversions
-- Creates performance variation so percentile rankings work properly

BEGIN TRANSACTION;

-- Get store IDs for each tier
-- We'll create 6 campaigns per store at different quantities to establish response curves

-- ============================================================================
-- HIGH PERFORMERS (5 stores) - Target 4.5-6% conversion rate
-- ============================================================================

-- Premium Downtown (store_high_01)
INSERT INTO retail_campaign_deployments (id, store_id, status, created_at)
SELECT
  'deploy_high01_' || value,
  (SELECT id FROM retail_stores WHERE store_number = 'STORE001'),
  'completed',
  datetime('now', '-' || (value * 15 + 10) || ' days')
FROM (SELECT '1' as value UNION SELECT '2' UNION SELECT '3' UNION SELECT '4' UNION SELECT '5' UNION SELECT '6');

-- Flagship Manhattan (store_high_02)
INSERT INTO retail_campaign_deployments (id, store_id, status, created_at)
SELECT
  'deploy_high02_' || value,
  (SELECT id FROM retail_stores WHERE store_number = 'STORE002'),
  'completed',
  datetime('now', '-' || (value * 15 + 10) || ' days')
FROM (SELECT '1' as value UNION SELECT '2' UNION SELECT '3' UNION SELECT '4' UNION SELECT '5' UNION SELECT '6');

-- Beverly Hills Store (store_high_03)
INSERT INTO retail_campaign_deployments (id, store_id, status, created_at)
SELECT
  'deploy_high03_' || value,
  (SELECT id FROM retail_stores WHERE store_number = 'STORE003'),
  'completed',
  datetime('now', '-' || (value * 15 + 10) || ' days')
FROM (SELECT '1' as value UNION SELECT '2' UNION SELECT '3' UNION SELECT '4' UNION SELECT '5' UNION SELECT '6');

-- Chicago Gold Coast (store_high_04)
INSERT INTO retail_campaign_deployments (id, store_id, status, created_at)
SELECT
  'deploy_high04_' || value,
  (SELECT id FROM retail_stores WHERE store_number = 'STORE004'),
  'completed',
  datetime('now', '-' || (value * 15 + 10) || ' days')
FROM (SELECT '1' as value UNION SELECT '2' UNION SELECT '3' UNION SELECT '4' UNION SELECT '5' UNION SELECT '6');

-- Miami Beach (store_high_05)
INSERT INTO retail_campaign_deployments (id, store_id, status, created_at)
SELECT
  'deploy_high05_' || value,
  (SELECT id FROM retail_stores WHERE store_number = 'STORE005'),
  'completed',
  datetime('now', '-' || (value * 15 + 10) || ' days')
FROM (SELECT '1' as value UNION SELECT '2' UNION SELECT '3' UNION SELECT '4' UNION SELECT '5' UNION SELECT '6');

-- ============================================================================
-- MEDIUM PERFORMERS (6 of 12 stores for demo) - Target 2.5-4% conversion rate
-- ============================================================================

INSERT INTO retail_campaign_deployments (id, store_id, status, created_at)
SELECT
  'deploy_med' || SUBSTR('0' || store_num, -2, 2) || '_' || campaign_num,
  (SELECT id FROM retail_stores WHERE store_number = 'STORE' || SUBSTR('00' || store_num, -3, 3)),
  'completed',
  datetime('now', '-' || (campaign_num * 15 + 10) || ' days')
FROM
  (SELECT '6' as store_num UNION SELECT '7' UNION SELECT '8' UNION SELECT '9' UNION SELECT '10' UNION SELECT '11') stores
  CROSS JOIN
  (SELECT '1' as campaign_num UNION SELECT '2' UNION SELECT '3' UNION SELECT '4' UNION SELECT '5' UNION SELECT '6') campaigns;

-- ============================================================================
-- LOW PERFORMERS (4 of 8 stores for demo) - Target 1.5-2.5% conversion rate
-- ============================================================================

INSERT INTO retail_campaign_deployments (id, store_id, status, created_at)
SELECT
  'deploy_low' || SUBSTR('0' || store_num, -2, 2) || '_' || campaign_num,
  (SELECT id FROM retail_stores WHERE store_number = 'STORE' || SUBSTR('00' || store_num, -3, 3)),
  'completed',
  datetime('now', '-' || (campaign_num * 15 + 10) || ' days')
FROM
  (SELECT '18' as store_num UNION SELECT '19' UNION SELECT '20' UNION SELECT '21') stores
  CROSS JOIN
  (SELECT '1' as campaign_num UNION SELECT '2' UNION SELECT '3' UNION SELECT '4' UNION SELECT '5' UNION SELECT '6') campaigns;

-- ============================================================================
-- CREATE RECIPIENTS AND CONVERSIONS
-- Using realistic quantities and conversion rates
-- ============================================================================

-- Helper: Create recipients for each deployment
-- High performers: campaigns at 300, 500, 800, 1200, 2000, 3500 pieces

-- Deployment 1: 300 pieces @ ~5.5% (17 conversions)
INSERT INTO recipients (id, tracking_id, name, email, created_at)
SELECT
  'recip_' || d.id || '_' || num.value,
  'track_' || d.id || '_' || num.value,
  'Customer ' || num.value,
  'customer' || num.value || '@example.com',
  d.created_at
FROM retail_campaign_deployments d
CROSS JOIN (
  SELECT '001' as value UNION SELECT '002' UNION SELECT '003' UNION SELECT '004' UNION SELECT '005'
  UNION SELECT '006' UNION SELECT '007' UNION SELECT '008' UNION SELECT '009' UNION SELECT '010'
  UNION SELECT '011' UNION SELECT '012' UNION SELECT '013' UNION SELECT '014' UNION SELECT '015'
  UNION SELECT '016' UNION SELECT '017' UNION SELECT '018' UNION SELECT '019' UNION SELECT '020'
  UNION SELECT '021' UNION SELECT '022' UNION SELECT '023' UNION SELECT '024' UNION SELECT '025'
  UNION SELECT '026' UNION SELECT '027' UNION SELECT '028' UNION SELECT '029' UNION SELECT '030'
  UNION SELECT '031' UNION SELECT '032' UNION SELECT '033' UNION SELECT '034' UNION SELECT '035'
  UNION SELECT '036' UNION SELECT '037' UNION SELECT '038' UNION SELECT '039' UNION SELECT '040'
  UNION SELECT '041' UNION SELECT '042' UNION SELECT '043' UNION SELECT '044' UNION SELECT '045'
  UNION SELECT '046' UNION SELECT '047' UNION SELECT '048' UNION SELECT '049' UNION SELECT '050'
  UNION SELECT '051' UNION SELECT '052' UNION SELECT '053' UNION SELECT '054' UNION SELECT '055'
  UNION SELECT '056' UNION SELECT '057' UNION SELECT '058' UNION SELECT '059' UNION SELECT '060'
  UNION SELECT '061' UNION SELECT '062' UNION SELECT '063' UNION SELECT '064' UNION SELECT '065'
  UNION SELECT '066' UNION SELECT '067' UNION SELECT '068' UNION SELECT '069' UNION SELECT '070'
  UNION SELECT '071' UNION SELECT '072' UNION SELECT '073' UNION SELECT '074' UNION SELECT '075'
  UNION SELECT '076' UNION SELECT '077' UNION SELECT '078' UNION SELECT '079' UNION SELECT '080'
  UNION SELECT '081' UNION SELECT '082' UNION SELECT '083' UNION SELECT '084' UNION SELECT '085'
  UNION SELECT '086' UNION SELECT '087' UNION SELECT '088' UNION SELECT '089' UNION SELECT '090'
  UNION SELECT '091' UNION SELECT '092' UNION SELECT '093' UNION SELECT '094' UNION SELECT '095'
  UNION SELECT '096' UNION SELECT '097' UNION SELECT '098' UNION SELECT '099' UNION SELECT '100'
  UNION SELECT '101' UNION SELECT '102' UNION SELECT '103' UNION SELECT '104' UNION SELECT '105'
  UNION SELECT '106' UNION SELECT '107' UNION SELECT '108' UNION SELECT '109' UNION SELECT '110'
  UNION SELECT '111' UNION SELECT '112' UNION SELECT '113' UNION SELECT '114' UNION SELECT '115'
  UNION SELECT '116' UNION SELECT '117' UNION SELECT '118' UNION SELECT '119' UNION SELECT '120'
  UNION SELECT '121' UNION SELECT '122' UNION SELECT '123' UNION SELECT '124' UNION SELECT '125'
  UNION SELECT '126' UNION SELECT '127' UNION SELECT '128' UNION SELECT '129' UNION SELECT '130'
  UNION SELECT '131' UNION SELECT '132' UNION SELECT '133' UNION SELECT '134' UNION SELECT '135'
  UNION SELECT '136' UNION SELECT '137' UNION SELECT '138' UNION SELECT '139' UNION SELECT '140'
  UNION SELECT '141' UNION SELECT '142' UNION SELECT '143' UNION SELECT '144' UNION SELECT '145'
  UNION SELECT '146' UNION SELECT '147' UNION SELECT '148' UNION SELECT '149' UNION SELECT '150'
  UNION SELECT '151' UNION SELECT '152' UNION SELECT '153' UNION SELECT '154' UNION SELECT '155'
  UNION SELECT '156' UNION SELECT '157' UNION SELECT '158' UNION SELECT '159' UNION SELECT '160'
  UNION SELECT '161' UNION SELECT '162' UNION SELECT '163' UNION SELECT '164' UNION SELECT '165'
  UNION SELECT '166' UNION SELECT '167' UNION SELECT '168' UNION SELECT '169' UNION SELECT '170'
  UNION SELECT '171' UNION SELECT '172' UNION SELECT '173' UNION SELECT '174' UNION SELECT '175'
  UNION SELECT '176' UNION SELECT '177' UNION SELECT '178' UNION SELECT '179' UNION SELECT '180'
  UNION SELECT '181' UNION SELECT '182' UNION SELECT '183' UNION SELECT '184' UNION SELECT '185'
  UNION SELECT '186' UNION SELECT '187' UNION SELECT '188' UNION SELECT '189' UNION SELECT '190'
  UNION SELECT '191' UNION SELECT '192' UNION SELECT '193' UNION SELECT '194' UNION SELECT '195'
  UNION SELECT '196' UNION SELECT '197' UNION SELECT '198' UNION SELECT '199' UNION SELECT '200'
  UNION SELECT '201' UNION SELECT '202' UNION SELECT '203' UNION SELECT '204' UNION SELECT '205'
  UNION SELECT '206' UNION SELECT '207' UNION SELECT '208' UNION SELECT '209' UNION SELECT '210'
  UNION SELECT '211' UNION SELECT '212' UNION SELECT '213' UNION SELECT '214' UNION SELECT '215'
  UNION SELECT '216' UNION SELECT '217' UNION SELECT '218' UNION SELECT '219' UNION SELECT '220'
  UNION SELECT '221' UNION SELECT '222' UNION SELECT '223' UNION SELECT '224' UNION SELECT '225'
  UNION SELECT '226' UNION SELECT '227' UNION SELECT '228' UNION SELECT '229' UNION SELECT '230'
  UNION SELECT '231' UNION SELECT '232' UNION SELECT '233' UNION SELECT '234' UNION SELECT '235'
  UNION SELECT '236' UNION SELECT '237' UNION SELECT '238' UNION SELECT '239' UNION SELECT '240'
  UNION SELECT '241' UNION SELECT '242' UNION SELECT '243' UNION SELECT '244' UNION SELECT '245'
  UNION SELECT '246' UNION SELECT '247' UNION SELECT '248' UNION SELECT '249' UNION SELECT '250'
  UNION SELECT '251' UNION SELECT '252' UNION SELECT '253' UNION SELECT '254' UNION SELECT '255'
  UNION SELECT '256' UNION SELECT '257' UNION SELECT '258' UNION SELECT '259' UNION SELECT '260'
  UNION SELECT '261' UNION SELECT '262' UNION SELECT '263' UNION SELECT '264' UNION SELECT '265'
  UNION SELECT '266' UNION SELECT '267' UNION SELECT '268' UNION SELECT '269' UNION SELECT '270'
  UNION SELECT '271' UNION SELECT '272' UNION SELECT '273' UNION SELECT '274' UNION SELECT '275'
  UNION SELECT '276' UNION SELECT '277' UNION SELECT '278' UNION SELECT '279' UNION SELECT '280'
  UNION SELECT '281' UNION SELECT '282' UNION SELECT '283' UNION SELECT '284' UNION SELECT '285'
  UNION SELECT '286' UNION SELECT '287' UNION SELECT '288' UNION SELECT '289' UNION SELECT '290'
  UNION SELECT '291' UNION SELECT '292' UNION SELECT '293' UNION SELECT '294' UNION SELECT '295'
  UNION SELECT '296' UNION SELECT '297' UNION SELECT '298' UNION SELECT '299' UNION SELECT '300'
) num
WHERE d.id LIKE 'deploy_%_1';

-- Link recipients to deployments
INSERT INTO retail_deployment_recipients (id, deployment_id, recipient_id)
SELECT
  'rdr_' || r.id,
  SUBSTR(r.id, 8, INSTR(SUBSTR(r.id, 8), '_') + 7 - 8 + LENGTH(SUBSTR(r.id, 8, INSTR(SUBSTR(r.id, 8), '_')))),
  r.id
FROM recipients r
WHERE r.id LIKE 'recip_deploy_%';

-- Create conversions for high performers (campaign 1: ~5.5% = 17 conversions out of 300)
INSERT INTO conversions (id, tracking_id, conversion_type, created_at)
SELECT
  'conv_' || r.tracking_id,
  r.tracking_id,
  'form_submission',
  datetime(r.created_at, '+' || (CAST(SUBSTR(r.id, -3) AS INTEGER) % 10) || ' days')
FROM recipients r
WHERE r.id LIKE 'recip_deploy_high%_1_%'
  AND CAST(SUBSTR(r.id, -3) AS INTEGER) <= 17;

-- Medium performers (campaign 1: ~3% = 9 conversions out of 300)
INSERT INTO conversions (id, tracking_id, conversion_type, created_at)
SELECT
  'conv_' || r.tracking_id,
  r.tracking_id,
  'form_submission',
  datetime(r.created_at, '+' || (CAST(SUBSTR(r.id, -3) AS INTEGER) % 10) || ' days')
FROM recipients r
WHERE r.id LIKE 'recip_deploy_med%_1_%'
  AND CAST(SUBSTR(r.id, -3) AS INTEGER) <= 9;

-- Low performers (campaign 1: ~2% = 6 conversions out of 300)
INSERT INTO conversions (id, tracking_id, conversion_type, created_at)
SELECT
  'conv_' || r.tracking_id,
  r.tracking_id,
  'form_submission',
  datetime(r.created_at, '+' || (CAST(SUBSTR(r.id, -3) AS INTEGER) % 10) || ' days')
FROM recipients r
WHERE r.id LIKE 'recip_deploy_low%_1_%'
  AND CAST(SUBSTR(r.id, -3) AS INTEGER) <= 6;

COMMIT;

-- Verify results
SELECT '✅ Campaign data populated' as status;

SELECT
  CASE
    WHEN s.size_category = 'high' THEN 'HIGH PERFORMERS'
    WHEN s.size_category = 'medium' THEN 'MEDIUM PERFORMERS'
    WHEN s.size_category = 'low' THEN 'LOW PERFORMERS'
    ELSE s.size_category
  END as tier,
  COUNT(DISTINCT s.id) as stores,
  COUNT(DISTINCT d.id) as total_campaigns,
  COUNT(DISTINCT rdr.recipient_id) as total_recipients,
  COUNT(DISTINCT c.id) as total_conversions,
  ROUND(CAST(COUNT(DISTINCT c.id) AS FLOAT) / COUNT(DISTINCT rdr.recipient_id) * 100, 2) || '%' as avg_conversion_rate
FROM retail_stores s
LEFT JOIN retail_campaign_deployments d ON s.id = d.store_id
LEFT JOIN retail_deployment_recipients rdr ON d.id = rdr.deployment_id
LEFT JOIN recipients r ON rdr.recipient_id = r.id
LEFT JOIN conversions c ON r.tracking_id = c.tracking_id
WHERE s.size_category IN ('high', 'medium', 'low')
GROUP BY tier
ORDER BY
  CASE tier
    WHEN 'HIGH PERFORMERS' THEN 1
    WHEN 'MEDIUM PERFORMERS' THEN 2
    WHEN 'LOW PERFORMERS' THEN 3
  END;

-- ==================== FIX SEARCH PATH VULNERABILITIES ====================
-- Migration: 034_fix_search_path_security
-- Phase: Production Security Hardening
-- Date: 2025-11-25
--
-- Issue: 32 PostgreSQL functions have mutable search_path (Supabase security warning)
-- Impact: Prevents search path hijacking attacks where malicious users could
--         create functions in alternate schemas that intercept legitimate calls
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- ===========================================================================

-- ==================== HIGH RISK FUNCTIONS (Credit/Payment Related) ====================

-- Credit manipulation functions (HIGH PRIORITY)
ALTER FUNCTION public.add_credits(uuid, integer)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.spend_credits(uuid, integer, text)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- Dynamic SQL execution (CRITICAL SECURITY)
ALTER FUNCTION public.exec_sql(text)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- ==================== TIMESTAMP UPDATE FUNCTIONS ====================

ALTER FUNCTION public.update_vendor_costs_updated_at()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_pricing_tier_timestamp()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_platform_role_timestamp()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_recipient_list_timestamp()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_recipient_timestamp()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_updated_at_column()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- ==================== STORAGE & USAGE FUNCTIONS ====================

ALTER FUNCTION public.get_organization_storage_bucket_usage(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_organization_storage_usage(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_organization_storage_mb(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.check_storage_limit(uuid, bigint)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- ==================== PRICING FUNCTIONS ====================

ALTER FUNCTION public.validate_pricing_tier_ranges()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_pricing_for_count(integer)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- ==================== PERMISSION & ROLE FUNCTIONS ====================

ALTER FUNCTION public.user_has_permission(uuid, text)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.set_initial_platform_admin_role()
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.user_has_role(uuid, text)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- ==================== TEMPLATE & ASSET FUNCTIONS ====================

ALTER FUNCTION public.increment_template_usage(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_template_performance(uuid, numeric, integer)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.increment_template_use_count(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.increment_asset_usage(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.migrate_template_to_surfaces(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_front_surface(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_back_surface(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.has_custom_back(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- ==================== CAMPAIGN FUNCTIONS ====================

ALTER FUNCTION public.calculate_campaign_cost_metrics(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- ==================== ORGANIZATION FUNCTIONS ====================

ALTER FUNCTION public.generate_org_slug_from_email(text)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_user_organization_id(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_user_organization(uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- ==================== FEATURE FLAG FUNCTIONS ====================

ALTER FUNCTION public.check_feature_flag(text, uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_feature_flag(text, boolean, uuid)
  SECURITY DEFINER
  SET search_path = public, pg_catalog;

-- ==================== VERIFICATION & TESTING ====================

-- Add comment to track migration
COMMENT ON SCHEMA public IS 'Search path security hardening applied - 034_fix_search_path_security.sql - 2025-11-25';

-- ===========================================================================
-- VERIFICATION QUERY
-- Run this after migration to confirm all functions now have search_path set:
--
-- SELECT
--   routine_name,
--   routine_type,
--   security_type,
--   routine_definition LIKE '%SET search_path%' as has_search_path
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
--   AND routine_type = 'FUNCTION'
-- ORDER BY routine_name;
--
-- Expected Result: All functions should have has_search_path = true
-- ===========================================================================

-- Migration complete
-- This fixes all 32 "Function Search Path Mutable" warnings in Supabase Dashboard
-- After applying, go to Database → Advisors to verify 0 warnings remain

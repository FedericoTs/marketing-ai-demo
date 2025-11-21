'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const MIGRATION_SQL = `CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  user_full_name TEXT;
  user_email TEXT;
  email_domain TEXT;
  org_name TEXT;
  org_slug TEXT;
  is_public_domain BOOLEAN;
  public_domains TEXT[] := ARRAY[
    'gmail.com', 'googlemail.com',
    'yahoo.com', 'yahoo.co.uk', 'yahoo.fr',
    'hotmail.com', 'outlook.com', 'live.com',
    'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'proton.me',
    'mail.com', 'aol.com', 'zoho.com',
    'yandex.com', 'gmx.com', 'tutanota.com'
  ];
BEGIN
  user_email := NEW.email;
  email_domain := lower(split_part(user_email, '@', 2));

  user_full_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(user_email, '@', 1)
  );

  is_public_domain := email_domain = ANY(public_domains);

  IF is_public_domain THEN
    org_name := user_full_name || '''s Workspace';
    email_domain := NULL;
  ELSE
    org_name := initcap(
      replace(
        regexp_replace(
          split_part(email_domain, '.', 1),
          '-',
          ' ',
          'g'
        ),
        '_',
        ' '
      )
    );
  END IF;

  org_slug := generate_org_slug_from_email(user_email);

  BEGIN
    INSERT INTO organizations (
      name,
      slug,
      email_domain,
      plan_tier,
      billing_status,
      credits,
      monthly_design_limit,
      monthly_sends_limit,
      created_at,
      updated_at
    ) VALUES (
      org_name,
      org_slug,
      email_domain,
      'free',
      'incomplete',
      0.00,
      0,
      0,
      NOW(),
      NOW()
    )
    RETURNING id INTO new_org_id;

  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Organization slug conflict. Please try signing up again.';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create organization: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO user_profiles (
      id,
      organization_id,
      full_name,
      email,
      role,
      platform_role,
      can_create_designs,
      can_send_campaigns,
      can_manage_billing,
      can_invite_users,
      can_approve_designs,
      can_manage_templates,
      can_access_analytics,
      created_at,
      updated_at,
      last_active_at
    ) VALUES (
      NEW.id,
      new_org_id,
      user_full_name,
      user_email,
      'owner',
      'user',
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      NOW(),
      NOW(),
      NOW()
    );

  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'Failed to link user to organization.';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
  END;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'SIGNUP ERROR for email %: %', user_email, SQLERRM;
    RAISE EXCEPTION 'We encountered an error creating your account. Please try again or contact support@droplab.com if the problem persists.';
END;
$$;`;

const PROJECT_REF = 'egccqmlhzqiirovstpal';
const DASHBOARD_SQL_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`;

export default function ApplyMigrationPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(MIGRATION_SQL);
      setCopied(true);
      toast.success('SQL copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error('Failed to copy SQL');
    }
  };

  const handleOpenDashboard = () => {
    window.open(DASHBOARD_SQL_URL, '_blank');
    toast.success('Opening Supabase Dashboard...');
  };

  const handleCopyAndOpen = async () => {
    await handleCopy();
    setTimeout(() => {
      handleOpenDashboard();
    }, 500);
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-orange-50 to-white">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Migration 023: Apply New User Defaults
          </h1>
          <p className="text-lg text-gray-600">
            Set new organizations to $0 credits and 0 monthly limits
          </p>
        </div>

        {/* Alert */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-2">
                  Manual Application Required
                </h3>
                <p className="text-orange-800 text-sm leading-relaxed">
                  Automated migration failed due to missing database credentials.
                  Follow the steps below to apply the migration via Supabase Dashboard (takes 30 seconds).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Apply */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Apply (Recommended)</CardTitle>
            <CardDescription>
              Copy SQL and open Dashboard in one click
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleCopyAndOpen}
              size="lg"
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            >
              <Copy className="mr-2 h-5 w-5" />
              Copy SQL & Open Dashboard
            </Button>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">After clicking above:</h4>
              <ol className="text-sm space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600">1.</span>
                  <span>SQL will be copied to clipboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600">2.</span>
                  <span>Supabase Dashboard will open in new tab</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600">3.</span>
                  <span>Paste (Ctrl+V) into the SQL Editor</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600">4.</span>
                  <span>Click "▶ Run" button (bottom right)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600">5.</span>
                  <span>Verify success message appears</span>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Manual Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Steps (Alternative)</CardTitle>
            <CardDescription>
              If quick apply doesn't work, follow these steps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button
                onClick={handleCopy}
                variant="outline"
                className="mb-2"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Migration SQL
                  </>
                )}
              </Button>

              <Button
                onClick={handleOpenDashboard}
                variant="outline"
                className="ml-2 mb-2"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Supabase Dashboard
              </Button>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-mono text-xs font-semibold mb-2 text-gray-700">
                Migration SQL Preview:
              </h4>
              <pre className="text-xs text-gray-600 overflow-x-auto max-h-40">
                {MIGRATION_SQL.substring(0, 500)}...
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Verification */}
        <Card>
          <CardHeader>
            <CardTitle>After Application: Verify</CardTitle>
            <CardDescription>
              Run this command to confirm migration succeeded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 p-4 rounded-lg">
              <code className="text-green-400 text-sm font-mono">
                npx tsx scripts/verify-migration-023.ts
              </code>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Expected output: All checks should show ✅
            </p>
          </CardContent>
        </Card>

        {/* What This Does */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">What This Migration Does</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Sets new organizations to <strong>$0.00 credits</strong> (was $100.00)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Sets <strong>monthly_design_limit to 0</strong> (was 100)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Sets <strong>monthly_sends_limit to 0</strong> (was 1000)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Sets <strong>billing_status to 'incomplete'</strong> (was 'trialing')</span>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-200">
                <strong>Result:</strong> New users must complete payment before accessing paid features
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

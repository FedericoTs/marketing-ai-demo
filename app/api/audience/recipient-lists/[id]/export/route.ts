/**
 * API Route: /api/audience/recipient-lists/[id]/export
 * GET - Export contacts from a recipient list to CSV
 */

import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const serviceSupabase = createServiceClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check feature flag for CSV export (use service role)
    const { data: orgData } = await serviceSupabase
      .from('organizations')
      .select('feature_flags, name')
      .eq('id', userProfile.organization_id)
      .single();

    const csvExportEnabled = orgData?.feature_flags?.csv_export_enabled !== false;

    if (!csvExportEnabled) {
      return NextResponse.json(
        { error: 'CSV export is disabled for your organization' },
        { status: 403 }
      );
    }

    // Verify the recipient list belongs to user's organization (use service role)
    const { data: recipientList, error: listError } = await serviceSupabase
      .from('recipient_lists')
      .select('id, name, organization_id, total_recipients, source, created_at')
      .eq('id', id)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (listError || !recipientList) {
      return NextResponse.json(
        { error: 'Recipient list not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch ALL contacts (no pagination for export - use service role)
    const { data: contacts, error: contactsError } = await serviceSupabase
      .from('recipients')
      .select('*')
      .eq('recipient_list_id', id)
      .eq('organization_id', userProfile.organization_id)
      .order('created_at', { ascending: true });

    if (contactsError) {
      console.error('[Export API] Error fetching contacts:', contactsError);
      return NextResponse.json(
        { error: 'Failed to fetch contacts', details: contactsError.message },
        { status: 500 }
      );
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json(
        { error: 'No contacts found in this list' },
        { status: 404 }
      );
    }

    // Generate CSV content
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Address Line 1',
      'Address Line 2',
      'City',
      'State',
      'ZIP Code',
      'Country',
      'Data Axle ID',
      'Created At',
    ];

    const csvRows = [headers.join(',')];

    contacts.forEach(contact => {
      const row = [
        escapeCSV(contact.first_name || ''),
        escapeCSV(contact.last_name || ''),
        escapeCSV(contact.email || ''),
        escapeCSV(contact.phone || ''),
        escapeCSV(contact.address_line1 || ''),
        escapeCSV(contact.address_line2 || ''),
        escapeCSV(contact.city || ''),
        escapeCSV(contact.state || ''),
        escapeCSV(contact.zip_code || ''),
        escapeCSV(contact.country || 'US'),
        escapeCSV(contact.data_axle_id || ''),
        escapeCSV(new Date(contact.created_at).toISOString()),
      ];
      csvRows.push(row.join(','));
    });

    // Add metadata rows
    if (contacts[0]?.metadata && Object.keys(contacts[0].metadata).length > 0) {
      const metadataKeys = Object.keys(contacts[0].metadata);
      const metadataHeaders = headers.concat(metadataKeys.map(k => escapeCSV(k)));
      csvRows[0] = metadataHeaders.join(',');

      contacts.forEach((contact, index) => {
        const metadataValues = metadataKeys.map(key =>
          escapeCSV(String(contact.metadata?.[key] || ''))
        );
        csvRows[index + 1] = csvRows[index + 1] + ',' + metadataValues.join(',');
      });
    }

    const csvContent = csvRows.join('\n');

    // Generate filename
    const filename = `${recipientList.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('[Export API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Escape CSV values (handle commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
  if (typeof value !== 'string') {
    value = String(value);
  }

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

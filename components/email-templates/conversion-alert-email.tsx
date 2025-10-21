interface ConversionAlertEmailProps {
  recipientName: string;
  campaignName: string;
  conversionType: string;
  timestamp: string;
  campaignId: string;
}

export function ConversionAlertEmail({
  recipientName,
  campaignName,
  conversionType,
  timestamp,
  campaignId,
}: ConversionAlertEmailProps) {
  const viewCampaignUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/campaigns/${campaignId}`;

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#ffffff',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#10b981',
        padding: '32px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '8px',
        }}>🎉</div>
        <h1 style={{
          color: '#ffffff',
          fontSize: '24px',
          fontWeight: '600',
          margin: '0',
        }}>New Conversion!</h1>
      </div>

      {/* Content */}
      <div style={{
        padding: '32px 24px',
        backgroundColor: '#f9fafb',
      }}>
        <p style={{
          fontSize: '16px',
          color: '#1f2937',
          lineHeight: '1.5',
          margin: '0 0 24px 0',
        }}>
          Great news! Someone just converted on your campaign:
        </p>

        {/* Campaign Info Card */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{
                  padding: '8px 0',
                  fontSize: '14px',
                  color: '#6b7280',
                  width: '40%',
                }}>
                  Campaign:
                </td>
                <td style={{
                  padding: '8px 0',
                  fontSize: '14px',
                  color: '#1f2937',
                  fontWeight: '600',
                }}>
                  {campaignName}
                </td>
              </tr>
              <tr>
                <td style={{
                  padding: '8px 0',
                  fontSize: '14px',
                  color: '#6b7280',
                }}>
                  Recipient:
                </td>
                <td style={{
                  padding: '8px 0',
                  fontSize: '14px',
                  color: '#1f2937',
                  fontWeight: '600',
                }}>
                  {recipientName}
                </td>
              </tr>
              <tr>
                <td style={{
                  padding: '8px 0',
                  fontSize: '14px',
                  color: '#6b7280',
                }}>
                  Action:
                </td>
                <td style={{
                  padding: '8px 0',
                  fontSize: '14px',
                  color: '#1f2937',
                  fontWeight: '600',
                }}>
                  {conversionType}
                </td>
              </tr>
              <tr>
                <td style={{
                  padding: '8px 0',
                  fontSize: '14px',
                  color: '#6b7280',
                }}>
                  Time:
                </td>
                <td style={{
                  padding: '8px 0',
                  fontSize: '14px',
                  color: '#1f2937',
                }}>
                  {new Date(timestamp).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* CTA Button */}
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <a href={viewCampaignUrl} style={{
            display: 'inline-block',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            padding: '12px 32px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600',
          }}>
            View Campaign Details
          </a>
        </div>

        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          lineHeight: '1.5',
          margin: '24px 0 0 0',
          textAlign: 'center',
        }}>
          Keep up the great work! 🚀
        </p>
      </div>

      {/* Footer */}
      <div style={{
        padding: '24px',
        backgroundColor: '#f3f4f6',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '12px',
          color: '#9ca3af',
          margin: '0 0 8px 0',
        }}>
          DropLab
        </p>
        <p style={{
          fontSize: '12px',
          color: '#9ca3af',
          margin: '0',
        }}>
          You're receiving this because conversion alerts are enabled in your notification settings.
        </p>
      </div>
    </div>
  );
}

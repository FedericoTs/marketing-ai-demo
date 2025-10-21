interface CampaignSummary {
  name: string;
  recipients: number;
  visitors: number;
  conversions: number;
  conversionRate: number;
}

interface PerformanceDigestEmailProps {
  period: string;
  totalCampaigns: number;
  totalRecipients: number;
  totalConversions: number;
  topCampaigns: CampaignSummary[];
  insights?: string[];
}

export function PerformanceDigestEmail({
  period,
  totalCampaigns,
  totalRecipients,
  totalConversions,
  topCampaigns,
  insights = [],
}: PerformanceDigestEmailProps) {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/analytics`;

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#ffffff',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '32px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '8px',
        }}>📊</div>
        <h1 style={{
          color: '#ffffff',
          fontSize: '24px',
          fontWeight: '600',
          margin: '0 0 8px 0',
        }}>Performance Digest</h1>
        <p style={{
          color: '#e0e7ff',
          fontSize: '14px',
          margin: '0',
        }}>
          {period}
        </p>
      </div>

      {/* Summary Stats */}
      <div style={{
        padding: '32px 24px',
        backgroundColor: '#f9fafb',
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          margin: '0 0 20px 0',
        }}>
          Overview
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '16px',
          marginBottom: '32px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#3b82f6',
              marginBottom: '4px',
            }}>
              {totalCampaigns}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Campaigns
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#8b5cf6',
              marginBottom: '4px',
            }}>
              {totalRecipients}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Recipients
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#10b981',
              marginBottom: '4px',
            }}>
              {totalConversions}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Conversions
            </div>
          </div>
        </div>

        {/* Top Campaigns */}
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          margin: '0 0 16px 0',
        }}>
          Top Performing Campaigns
        </h2>

        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '32px',
        }}>
          {topCampaigns.map((campaign, index) => (
            <div key={index} style={{
              padding: '16px 20px',
              borderBottom: index < topCampaigns.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1f2937',
                }}>
                  {campaign.name}
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#10b981',
                }}>
                  {campaign.conversionRate}%
                </div>
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
              }}>
                {campaign.recipients} recipients • {campaign.visitors} visitors • {campaign.conversions} conversions
              </div>
            </div>
          ))}
        </div>

        {/* AI Insights */}
        {insights.length > 0 && (
          <>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 16px 0',
            }}>
              💡 Smart Insights
            </h2>

            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #dbeafe',
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '32px',
            }}>
              {insights.map((insight, index) => (
                <div key={index} style={{
                  fontSize: '14px',
                  color: '#1e40af',
                  lineHeight: '1.6',
                  marginBottom: index < insights.length - 1 ? '12px' : '0',
                }}>
                  • {insight}
                </div>
              ))}
            </div>
          </>
        )}

        {/* CTA Button */}
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <a href={dashboardUrl} style={{
            display: 'inline-block',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            padding: '12px 32px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600',
          }}>
            View Full Analytics Dashboard
          </a>
        </div>
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
          You're receiving {period.toLowerCase()} digests. Update your preferences in settings.
        </p>
      </div>
    </div>
  );
}

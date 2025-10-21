interface ThresholdAlertEmailProps {
  campaignName: string;
  campaignId: string;
  alertType: "low_conversion" | "low_engagement";
  currentValue: number;
  threshold: number;
  recommendations?: string[];
}

export function ThresholdAlertEmail({
  campaignName,
  campaignId,
  alertType,
  currentValue,
  threshold,
  recommendations = [],
}: ThresholdAlertEmailProps) {
  const viewCampaignUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/campaigns/${campaignId}`;

  const alertConfig = {
    low_conversion: {
      icon: '📉',
      title: 'Low Conversion Rate Alert',
      metric: 'Conversion Rate',
      color: '#f59e0b',
    },
    low_engagement: {
      icon: '👀',
      title: 'Low Engagement Alert',
      metric: 'Engagement Rate',
      color: '#ef4444',
    },
  };

  const config = alertConfig[alertType];

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#ffffff',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: config.color,
        padding: '32px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '8px',
        }}>{config.icon}</div>
        <h1 style={{
          color: '#ffffff',
          fontSize: '24px',
          fontWeight: '600',
          margin: '0',
        }}>{config.title}</h1>
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
          Your campaign <strong>{campaignName}</strong> needs attention.
        </p>

        {/* Alert Card */}
        <div style={{
          backgroundColor: '#fff7ed',
          border: '2px solid #fed7aa',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <div>
              <div style={{
                fontSize: '12px',
                color: '#78350f',
                textTransform: 'uppercase',
                fontWeight: '600',
                letterSpacing: '0.5px',
                marginBottom: '4px',
              }}>
                {config.metric}
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#c2410c',
              }}>
                {currentValue}%
              </div>
            </div>
            <div style={{
              textAlign: 'right',
            }}>
              <div style={{
                fontSize: '12px',
                color: '#78350f',
                textTransform: 'uppercase',
                fontWeight: '600',
                letterSpacing: '0.5px',
                marginBottom: '4px',
              }}>
                Threshold
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#92400e',
              }}>
                {threshold}%
              </div>
            </div>
          </div>

          <div style={{
            fontSize: '14px',
            color: '#92400e',
            backgroundColor: '#fed7aa',
            padding: '8px 12px',
            borderRadius: '4px',
            textAlign: 'center',
          }}>
            ⚠️ Below threshold by {(threshold - currentValue).toFixed(1)}%
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 16px 0',
            }}>
              💡 Recommended Actions
            </h2>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '24px',
            }}>
              {recommendations.map((rec, index) => (
                <div key={index} style={{
                  fontSize: '14px',
                  color: '#374151',
                  lineHeight: '1.6',
                  marginBottom: index < recommendations.length - 1 ? '12px' : '0',
                  paddingLeft: '20px',
                  position: 'relative',
                }}>
                  <span style={{
                    position: 'absolute',
                    left: '0',
                    color: '#3b82f6',
                    fontWeight: '600',
                  }}>
                    {index + 1}.
                  </span>
                  {rec}
                </div>
              ))}
            </div>
          </>
        )}

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
            View Campaign & Take Action
          </a>
        </div>

        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          lineHeight: '1.5',
          margin: '24px 0 0 0',
          textAlign: 'center',
        }}>
          Early intervention can significantly improve campaign performance.
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
          You're receiving threshold alerts. Adjust your alert thresholds in notification settings.
        </p>
      </div>
    </div>
  );
}

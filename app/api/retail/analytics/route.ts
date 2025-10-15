import { NextRequest, NextResponse } from 'next/server';
import {
  getStorePerformanceClusters,
  getPerformanceByAttribute,
  getTimeBasedPatterns,
  getTopPerformers,
  getUnderperformers,
  getRegionalPerformance,
  getCorrelationAnalysis,
  getRetailAnalyticsSummary,
} from '@/lib/database/retail-analytics';

/**
 * GET /api/retail/analytics
 * Comprehensive retail analytics endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';

    switch (type) {
      case 'summary':
        const summary = getRetailAnalyticsSummary();

        // Check if there's any data
        if (summary.totalStores === 0) {
          return NextResponse.json({
            success: true,
            data: summary,
            warning: 'No retail data available. Please add stores and deploy campaigns to see insights.',
          });
        }

        return NextResponse.json({ success: true, data: summary });

      case 'clusters':
        const clusters = getStorePerformanceClusters();
        return NextResponse.json({ success: true, data: clusters });

      case 'top-performers':
        const limit = parseInt(searchParams.get('limit') || '10');
        const metric = searchParams.get('metric') || 'conversion_rate';
        const topPerformers = getTopPerformers(
          limit,
          metric as 'conversion_rate' | 'conversions'
        );
        return NextResponse.json({ success: true, data: topPerformers });

      case 'underperformers':
        const threshold = parseFloat(searchParams.get('threshold') || '5.0');
        const underperformers = getUnderperformers(threshold);
        return NextResponse.json({ success: true, data: underperformers });

      case 'regional':
        const regional = getRegionalPerformance();
        return NextResponse.json({ success: true, data: regional });

      case 'correlations':
        const correlations = getCorrelationAnalysis();
        return NextResponse.json({ success: true, data: correlations });

      case 'time-patterns':
        const groupBy = (searchParams.get('groupBy') as 'dayofweek' | 'week' | 'month') || 'dayofweek';
        const timePatterns = getTimeBasedPatterns(groupBy);
        return NextResponse.json({ success: true, data: timePatterns });

      case 'by-attribute':
        const attribute = (searchParams.get('attribute') as
          | 'size_category'
          | 'region'
          | 'district') || 'size_category';
        const byAttribute = getPerformanceByAttribute(attribute);
        return NextResponse.json({ success: true, data: byAttribute });

      case 'all':
        // Return comprehensive analytics
        const allData = {
          summary: getRetailAnalyticsSummary(),
          clusters: getStorePerformanceClusters(),
          topPerformers: getTopPerformers(10),
          regional: getRegionalPerformance(),
          correlations: getCorrelationAnalysis(),
          timePatterns: getTimeBasedPatterns('dayofweek'),
        };
        return NextResponse.json({ success: true, data: allData });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid analytics type',
          },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error fetching retail analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch analytics',
      },
      { status: 500 }
    );
  }
}

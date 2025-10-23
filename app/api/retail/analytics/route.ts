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
import { successResponse, errorResponse } from '@/lib/utils/api-response';

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
          return NextResponse.json(
            successResponse(summary, 'No retail data available. Please add stores and deploy campaigns to see insights.')
          );
        }

        return NextResponse.json(
          successResponse(summary, 'Analytics summary retrieved successfully')
        );

      case 'clusters':
        const clusters = getStorePerformanceClusters();
        return NextResponse.json(
          successResponse(clusters, 'Performance clusters retrieved successfully')
        );

      case 'top-performers':
        const limit = parseInt(searchParams.get('limit') || '10');
        const metric = searchParams.get('metric') || 'conversion_rate';
        const topPerformers = getTopPerformers(
          limit,
          metric as 'conversion_rate' | 'conversions'
        );
        return NextResponse.json(
          successResponse(topPerformers, 'Top performers retrieved successfully')
        );

      case 'underperformers':
        const threshold = parseFloat(searchParams.get('threshold') || '5.0');
        const underperformers = getUnderperformers(threshold);
        return NextResponse.json(
          successResponse(underperformers, 'Underperformers retrieved successfully')
        );

      case 'regional':
        const regional = getRegionalPerformance();
        return NextResponse.json(
          successResponse(regional, 'Regional performance retrieved successfully')
        );

      case 'correlations':
        const correlations = getCorrelationAnalysis();
        return NextResponse.json(
          successResponse(correlations, 'Correlation analysis retrieved successfully')
        );

      case 'time-patterns':
        const groupBy = (searchParams.get('groupBy') as 'dayofweek' | 'week' | 'month') || 'dayofweek';
        const timePatterns = getTimeBasedPatterns(groupBy);
        return NextResponse.json(
          successResponse(timePatterns, 'Time patterns retrieved successfully')
        );

      case 'by-attribute':
        const attribute = (searchParams.get('attribute') as
          | 'size_category'
          | 'region'
          | 'district') || 'size_category';
        const byAttribute = getPerformanceByAttribute(attribute);
        return NextResponse.json(
          successResponse(byAttribute, 'Performance by attribute retrieved successfully')
        );

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
        return NextResponse.json(
          successResponse(allData, 'All analytics retrieved successfully')
        );

      default:
        return NextResponse.json(
          errorResponse('Invalid analytics type', 'INVALID_TYPE'),
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error fetching retail analytics:', error);
    return NextResponse.json(
      errorResponse(error.message || 'Failed to fetch analytics', 'FETCH_ERROR'),
      { status: 500 }
    );
  }
}

# Data Axle Audience Targeting Client

Production-ready TypeScript client for Data Axle People API with built-in rate limiting, caching, and error handling.

## Quick Start

```typescript
import { getDataAxleClient, type AudienceFilters } from '@/lib/audience'

// Initialize client (singleton pattern)
const client = getDataAxleClient({
  apiKey: process.env.DATA_AXLE_API_KEY!,
  costPerContact: 0.15,        // Our cost from Data Axle
  userCostPerContact: 0.25,    // What we charge users
  enableCache: true,
  cacheTTL: 300,               // 5 minutes
})

// Example 1: Get count (FREE - no charge)
const filters: AudienceFilters = {
  state: 'CA',
  ageMin: 65,
  ageMax: 80,
  homeowner: true,
  incomeMin: 75000,
}

const countResponse = await client.getCount(filters)
console.log(countResponse)
// {
//   count: 1250000,
//   estimatedCost: 187500,  // $187,500 (our cost)
//   userCharge: 312500,     // $312,500 (user pays)
//   margin: 125000,         // $125,000 profit
//   costPerContact: 0.15,
//   userCostPerContact: 0.25
// }

// Example 2: Purchase contacts (PAID)
const contacts = await client.purchaseContacts(
  filters,
  5000, // max contacts
  (current, total) => {
    console.log(`Progress: ${current}/${total}`)
  }
)

console.log(`Purchased ${contacts.length} contacts`)
```

## Features

### ✅ Rate Limiting
- Automatic rate limiting (150 requests / 10 seconds)
- Shared across all instances with same API key
- Prevents API quota errors

### ✅ Caching
- In-memory cache for count requests
- Configurable TTL (default: 5 minutes)
- Automatic cache cleanup

### ✅ Retry Logic
- Exponential backoff (1s, 2s, 4s)
- Retries on server errors (500+) and rate limits (429)
- Does NOT retry on client errors (400-499)

### ✅ Error Handling
- Custom DataAxleError with status codes
- Detailed error logging
- Graceful degradation (partial results on purchase failures)

### ✅ Type Safety
- Complete TypeScript definitions
- Type-safe filter building
- IntelliSense support

## API Reference

### `getCount(filters, options?)`

Get count of contacts matching filters. **FREE - no charge from Data Axle.**

```typescript
const response = await client.getCount(
  {
    state: 'CA',
    ageMin: 55,
    ageMax: 65,
    homeowner: true,
  },
  { useCache: true } // Optional: disable with false
)
```

**Returns:** `AudienceCountResponse`
- `count`: Number of matching contacts
- `estimatedCost`: Total cost for ALL contacts at our rate
- `userCharge`: Total charge to user
- `margin`: Profit margin
- `costPerContact`: Our cost per contact
- `userCostPerContact`: User cost per contact

### `purchaseContacts(filters, maxContacts, onProgress?)`

Purchase contacts matching filters. **PAID - charges from Data Axle.**

```typescript
const contacts = await client.purchaseContacts(
  filters,
  5000,
  (current, total) => console.log(`${current}/${total}`)
)
```

**Parameters:**
- `filters`: Audience targeting criteria
- `maxContacts`: Maximum contacts to purchase (1-10,000)
- `onProgress`: Optional progress callback

**Returns:** `DataAxleContact[]`

### `getRateLimiterStatus()`

Monitor rate limiter state.

```typescript
const status = client.getRateLimiterStatus()
// { current: 45, limit: 150, available: 105 }
```

### `clearCache()`

Clear in-memory cache (useful for testing).

```typescript
client.clearCache()
```

## Filter Reference

All filters are optional. Multiple filters are combined with AND logic.

### Geographic Filters

```typescript
{
  state: 'CA',              // Two-letter state code
  city: 'San Francisco',
  zip: '94105',
  county: 'San Francisco',
  geoDistance: {            // Radius search
    lat: 37.7749,
    lon: -122.4194,
    distance: 25            // miles
  }
}
```

### Demographic Filters

```typescript
{
  ageMin: 55,
  ageMax: 65,
  gender: 'M',              // 'M' | 'F' | 'U'
  maritalStatus: 'M',       // 'S' | 'M' | 'D' | 'W'
}
```

### Financial Filters

```typescript
{
  incomeMin: 75000,
  incomeMax: 150000,
  homeowner: true,          // boolean
  homeValueMin: 500000,
  homeValueMax: 1000000,
  netWorthMin: 1000000,
}
```

### Lifestyle Filters

```typescript
{
  interests: ['golf', 'travel', 'investing'],
  behaviors: ['luxury_shopper', 'technology_enthusiast'],
}
```

## Environment Variables

```bash
# .env.local
DATA_AXLE_API_KEY=your_api_key_here
DATA_AXLE_BASE_URL=https://api.data-axle.com/v1/people
DATA_AXLE_COST_PER_CONTACT=0.15
```

## Error Handling

```typescript
import { DataAxleError } from '@/lib/audience'

try {
  const response = await client.getCount(filters)
} catch (error) {
  if (error instanceof Error) {
    console.error('Failed to get count:', error.message)

    if ('statusCode' in error) {
      console.error('HTTP Status:', (error as any).statusCode)
    }
  }
}
```

## Advanced: Custom Filter DSL

For advanced users, you can provide raw Data Axle Filter DSL:

```typescript
const filters: AudienceFilters = {
  rawFilterDSL: {
    connective: 'or',
    propositions: [
      {
        relation: 'equals',
        attribute: 'state',
        value: 'CA'
      },
      {
        relation: 'equals',
        attribute: 'state',
        value: 'NY'
      }
    ]
  }
}
```

## Performance Considerations

1. **Count Caching**: Count requests are cached for 5 minutes by default. Adjust with `cacheTTL`.

2. **Batch Purchases**: Purchase API fetches 400 contacts per page. A 10,000 contact purchase makes 25 API calls.

3. **Rate Limiting**: Client shares rate limiter across instances with same API key. If you have multiple servers, implement distributed rate limiting.

4. **Memory Usage**: In-memory cache grows with unique filter combinations. Cache is cleaned every 100 entries.

## Testing

```typescript
// Mock for testing
jest.mock('@/lib/audience', () => ({
  getDataAxleClient: jest.fn(() => ({
    getCount: jest.fn().mockResolvedValue({
      count: 1000,
      estimatedCost: 150,
      userCharge: 250,
      margin: 100,
      costPerContact: 0.15,
      userCostPerContact: 0.25,
    }),
    purchaseContacts: jest.fn().mockResolvedValue([
      { person_id: '123', first_name: 'John', last_name: 'Doe', /* ... */ }
    ]),
  })),
}))
```

## Production Checklist

- [ ] Data Axle API key configured
- [ ] Cost per contact verified ($0.15 typical)
- [ ] User pricing configured ($0.25 recommended)
- [ ] Error monitoring in place
- [ ] Rate limit monitoring
- [ ] Cache TTL optimized for use case
- [ ] Billing integration for purchased contacts
- [ ] Usage tracking for Stripe metering

## Support

For Data Axle API issues:
- Documentation: https://api.data-axle.com/v1/people/docs
- Support: partnerships@data-axle.com

For client issues:
- Check logs for detailed error messages
- Verify API key and environment variables
- Monitor rate limiter status

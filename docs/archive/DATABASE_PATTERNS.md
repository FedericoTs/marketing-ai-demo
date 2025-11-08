# Database Query Patterns

This document provides guidelines for writing consistent, maintainable database queries in the DropLab platform.

## Overview

The database layer uses **better-sqlite3** with a pragmatic approach to error handling, validation, and logging. We prioritize:
- Input validation to prevent bad data
- Structured logging for debugging
- Consistent error handling
- Zero breaking changes

## Architecture

```
lib/database/
├── connection.ts         # Database initialization
├── schema.ts             # Table definitions
├── logger.ts             # Structured logging utility
├── validators.ts         # Input validation helpers
├── tracking-queries.ts   # Campaign/recipient tracking
├── call-tracking-queries.ts  # ElevenLabs call tracking
├── batch-job-queries.ts  # Batch job processing
└── retail-queries.ts     # Retail store operations
```

## Core Utilities

### Database Logger (`logger.ts`)

Provides structured, toggleable logging for all database operations.

**Features:**
- Automatic disable in production (unless `DATABASE_LOGGING=true`)
- Context-rich logging with metadata
- Performance timing support
- Multiple log levels: debug, info, warn, error

**Usage:**
```typescript
import { dbLogger } from './logger';

// Log successful operations
dbLogger.info('createCampaign', 'campaigns', campaignId, { name: 'Summer Sale' });

// Log debug information
dbLogger.debug('getCampaign found', { id: campaignId, status: 'active' });

// Log warnings (non-fatal issues)
dbLogger.warn('updateCampaign', 'No rows updated', { id: campaignId });

// Log errors
dbLogger.error('createCampaign', error, { name: campaignName });

// Performance timing
const endTimer = dbLogger.time('bulkInsert');
// ... perform operation
endTimer(); // Logs duration automatically
```

### Input Validators (`validators.ts`)

Type-safe validation with automatic error logging.

**Available Validators:**
- `validateRequired(value, fieldName, operation)` - Not null/undefined/empty
- `validateString(value, fieldName, operation, options)` - String with min/max length
- `validateId(value, fieldName, operation)` - Non-empty string ID
- `validateEmail(value, fieldName, operation)` - Valid email format
- `validateNumber(value, fieldName, operation, options)` - Number with min/max/integer
- `validateEnum(value, fieldName, operation, allowedValues)` - Enum validation
- `validateBoolean(value, fieldName, operation)` - Boolean type
- `validateISODate(value, fieldName, operation)` - Valid ISO 8601 date
- `validateArray(value, fieldName, operation, options)` - Array with min/max length
- `validateObject(value, fieldName, operation)` - Object type

**Usage:**
```typescript
import { validateId, validateString, validateEnum } from './validators';

// Validate required ID
validateId(campaignId, 'campaignId', 'createRecipient');

// Validate string with length constraints
validateString(name, 'name', 'createCampaign', { minLength: 1, maxLength: 255 });

// Validate enum values
validateEnum(status, 'status', 'updateBatchJob', ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const);

// Validate numbers with constraints
validateNumber(totalRecipients, 'totalRecipients', 'createBatchJob', { min: 1, integer: true });
```

**Error Handling:**
All validators throw `ValidationError` with structured context:
```typescript
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

## Standard Query Pattern

All database query functions should follow this consistent pattern:

### 1. Function Structure

```typescript
export function createRecord(data: {
  requiredField: string;
  optionalField?: string;
}): RecordType {
  const operation = 'createRecord';  // ✅ Step 1: Define operation name

  // ✅ Step 2: Validate all required inputs
  validateString(data.requiredField, 'requiredField', operation, { minLength: 1 });

  const db = getDatabase();
  const id = nanoid(16);
  const created_at = new Date().toISOString();

  // ✅ Step 3: Log operation start
  dbLogger.info(operation, 'table_name', id, { requiredField: data.requiredField });

  const stmt = db.prepare(`INSERT INTO table_name (...) VALUES (...)`);

  // ✅ Step 4: Wrap DB operations in try-catch
  try {
    stmt.run(id, data.requiredField, data.optionalField || null, created_at);

    // ✅ Step 5: Log success
    dbLogger.debug(`${operation} completed`, { id });
  } catch (error) {
    // ✅ Step 6: Log error with context
    dbLogger.error(operation, error as Error, { requiredField: data.requiredField });
    throw error;
  }

  return { id, ...data, created_at };
}
```

### 2. Read Operations

```typescript
export function getRecordById(id: string): RecordType | null {
  const operation = 'getRecordById';

  validateId(id, 'id', operation);

  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM table_name WHERE id = ?");

  try {
    const record = stmt.get(id) as RecordType | null;

    if (record) {
      dbLogger.debug(`${operation} found`, { id });
    } else {
      dbLogger.debug(`${operation} not found`, { id });
    }

    return record;
  } catch (error) {
    dbLogger.error(operation, error as Error, { id });
    throw error;
  }
}
```

### 3. Update Operations

```typescript
export function updateRecord(
  id: string,
  data: Partial<RecordType>
): boolean {
  const operation = 'updateRecord';

  validateId(id, 'id', operation);

  const db = getDatabase();
  const updated_at = new Date().toISOString();

  // Build dynamic SQL (existing pattern)
  const updates: string[] = [];
  const params: any[] = [];

  if (data.field1 !== undefined) {
    updates.push('field1 = ?');
    params.push(data.field1);
  }

  if (updates.length === 0) {
    dbLogger.warn(operation, 'No fields to update', { id });
    return false;
  }

  dbLogger.info(operation, 'table_name', id, { fieldsUpdated: updates.length });

  const stmt = db.prepare(`UPDATE table_name SET ${updates.join(', ')} WHERE id = ?`);
  params.push(id);

  try {
    const result = stmt.run(...params);
    const success = result.changes > 0;

    if (success) {
      dbLogger.debug(`${operation} completed`, { id, fieldsUpdated: updates.length });
    } else {
      dbLogger.warn(operation, 'No rows updated (record not found?)', { id });
    }

    return success;
  } catch (error) {
    dbLogger.error(operation, error as Error, { id });
    throw error;
  }
}
```

### 4. Delete Operations

```typescript
export function deleteRecord(id: string): boolean {
  const operation = 'deleteRecord';

  validateId(id, 'id', operation);

  const db = getDatabase();

  dbLogger.info(operation, 'table_name', id);

  const stmt = db.prepare("DELETE FROM table_name WHERE id = ?");

  try {
    const result = stmt.run(id);
    const success = result.changes > 0;

    if (success) {
      dbLogger.debug(`${operation} completed`, { id });
    } else {
      dbLogger.warn(operation, 'No rows deleted (record not found?)', { id });
    }

    return success;
  } catch (error) {
    dbLogger.error(operation, error as Error, { id });
    throw error;
  }
}
```

## Validation Best Practices

### Required vs Optional Fields

```typescript
// Required field - validate always
validateString(data.name, 'name', operation, { minLength: 1 });

// Optional field - validate only if provided
if (data.email) {
  validateEmail(data.email, 'email', operation);
}
```

### Enum Validation

Always validate enum fields to prevent invalid status values:

```typescript
// Campaign status
validateEnum(status, 'status', operation, ['active', 'paused', 'completed'] as const);

// Event types
validateEnum(eventType, 'eventType', operation, [
  'page_view', 'qr_scan', 'button_click', 'form_submit'
] as const);
```

### Number Constraints

```typescript
// Integer only (e.g., counts)
validateNumber(count, 'totalRecipients', operation, { min: 1, integer: true });

// Range validation (e.g., percentages)
validateNumber(progress, 'progressPercent', operation, { min: 0, max: 100 });

// Optional with defaults
if (limit !== undefined) {
  validateNumber(limit, 'limit', operation, { min: 1, max: 1000 });
}
```

### String Length Limits

Match database column constraints:

```typescript
// VARCHAR(255) fields
validateString(name, 'name', operation, { minLength: 1, maxLength: 255 });

// TEXT fields (no max)
validateString(message, 'message', operation, { minLength: 1 });

// Short codes (e.g., tracking IDs)
validateString(trackingId, 'trackingId', operation, { minLength: 16, maxLength: 16 });
```

## Logging Best Practices

### Log Levels

**Use `info`** for:
- Record creation (CREATE)
- Important updates (UPDATE status)
- Record deletion (DELETE)

**Use `debug`** for:
- Operation completion
- Records found/not found
- Detailed operation context

**Use `warn`** for:
- Non-fatal issues (no rows updated, validation skipped)
- Edge cases (empty results, missing optional data)

**Use `error`** for:
- Database errors
- Validation failures
- Constraint violations

### Contextual Information

Include relevant context in all log calls:

```typescript
// CREATE: Log identifying fields
dbLogger.info('createCampaign', 'campaigns', id, { name: data.name });

// UPDATE: Log what changed
dbLogger.info('updateBatchJobStatus', 'batch_jobs', id, {
  status,
  hasError: !!options?.errorMessage
});

// READ: Log search criteria
dbLogger.debug('getCampaignById found', { id, status: campaign.status });

// ERROR: Log full context
dbLogger.error('createRecipient', error, {
  campaignId: data.campaignId,
  name: data.name
});
```

## Common Patterns

### Nullable Return Types

Many functions return `null` for "not found" cases - this is intentional and good:

```typescript
export function getCampaignById(id: string): Campaign | null {
  // Returns null if not found (NOT an error)
  const campaign = stmt.get(id) as Campaign | null;
  return campaign;
}
```

### Timestamps

Always use ISO 8601 format:

```typescript
const created_at = new Date().toISOString();
const updated_at = new Date().toISOString();
```

### ID Generation

Use nanoid for all record IDs:

```typescript
import { nanoid } from 'nanoid';

const id = nanoid(16); // 16-character alphanumeric ID
```

### SQL Injection Protection

Always use parameterized queries:

```typescript
// ✅ SAFE: Parameterized
const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
const user = stmt.get(userId);

// ❌ UNSAFE: String concatenation
const stmt = db.prepare(`SELECT * FROM users WHERE id = '${userId}'`);
```

### Dynamic ORDER BY Validation

For dynamic sorting, validate column names with allowlist:

```typescript
const validSortColumns = ['store_number', 'name', 'city', 'created_at'] as const;
const validSortOrders = ['ASC', 'DESC'] as const;

if (!validSortColumns.includes(sortBy as any)) {
  throw new Error(`Invalid sortBy column: ${sortBy}`);
}

if (!validSortOrders.includes(sortOrder as any)) {
  throw new Error(`Invalid sortOrder: ${sortOrder}`);
}

// Now safe to use in SQL
const stmt = db.prepare(`
  SELECT * FROM stores
  ORDER BY ${sortBy} ${sortOrder}
`);
```

## Migrated Functions

The following functions have been migrated to use the new validation and logging patterns:

### `tracking-queries.ts` (5 functions)
- ✅ `createCampaign()` - Validates name, message, companyName
- ✅ `getCampaignById()` - Validates ID, logs found/not found
- ✅ `createRecipient()` - Validates campaignId, name, lastname
- ✅ `trackEvent()` - Validates event type enum
- ✅ `trackConversion()` - Validates conversion type enum

### `call-tracking-queries.ts` (3 functions)
- ✅ `upsertElevenLabsCall()` - Validates conversation_id, call_started_at, call_status enum
- ✅ `getCampaignCallMetrics()` - Validates campaignId
- ✅ `getAllCallMetrics()` - Validates optional date parameters

### `batch-job-queries.ts` (3 functions)
- ✅ `createBatchJob()` - Validates campaignId, totalRecipients (min 1, integer), optional email
- ✅ `getBatchJob()` - Validates ID, logs found/not found
- ✅ `updateBatchJobStatus()` - Validates ID and status enum (5 values), warns on no rows

### `retail-queries.ts` (2 functions)
- ✅ `createRetailStore()` - Validates storeNumber (1-50 chars), name (1-255 chars)
- ✅ `updateRetailStore()` - Validates ID, warns on no fields/rows updated

**Total:** 13 critical functions migrated

## Remaining Functions

**157 functions remain unmigrated** across 11 database files. These follow the same patterns but do not yet have validation/logging. Future migrations should follow the patterns documented here.

## Performance Considerations

### Logging Overhead

Database logging is automatically disabled in production unless explicitly enabled:

```bash
# Enable in production (for debugging)
DATABASE_LOGGING=true npm start

# Disabled by default
npm start
```

Development mode always has logging enabled.

### Validation Overhead

Validation adds minimal overhead (~0.1ms per function call) but prevents:
- Invalid data entering the database
- Constraint violation errors
- Data corruption issues
- Type coercion bugs

The trade-off is worthwhile for data integrity.

### Transaction Support

For bulk operations, use better-sqlite3 transactions:

```typescript
const insert = db.transaction((records) => {
  const stmt = db.prepare(`INSERT INTO table (...) VALUES (...)`);

  for (const record of records) {
    stmt.run(record.field1, record.field2);
  }
});

// Execute atomically
insert(records);
```

## Testing

### Manual Testing

Test all migrated functions in development:

```typescript
// Test validation failures
try {
  createCampaign({ name: '', message: 'test', companyName: 'test' });
} catch (error) {
  // Should throw ValidationError: "name must be at least 1 characters"
}

// Test successful operations
const campaign = createCampaign({
  name: 'Summer Sale',
  message: 'Get 20% off!',
  companyName: 'Acme Corp'
});

// Check logging output in console
// Should see: [DB INFO] createCampaign campaigns <id> { name: 'Summer Sale' }
```

### Production Monitoring

Monitor error logs in production for:
- Validation errors (indicate bad input from API)
- Database errors (indicate schema issues or constraints)
- Performance issues (use timing logs)

## Migration Checklist

When migrating a new database function:

- [ ] Import logger and validators at top of file
- [ ] Define `operation` constant (e.g., `'createUser'`)
- [ ] Add validation for all required inputs
- [ ] Add validation for optional inputs (if provided)
- [ ] Add `info` logging for operation start (CREATE/UPDATE/DELETE)
- [ ] Wrap database operations in try-catch
- [ ] Add `debug` logging on success
- [ ] Add `error` logging in catch block with context
- [ ] Add `warn` logging for edge cases (no rows, empty results)
- [ ] Test validation errors
- [ ] Test successful operations
- [ ] Verify logging output
- [ ] No breaking changes to function signature
- [ ] No changes to return types

## Rollback Plan

If issues arise, the utilities can be safely disabled:

```typescript
// Disable logging (emergency)
import { dbLogger } from './logger';
dbLogger.disable();

// Functions still work without validation (remove validators)
// This is why we maintain backward compatibility
```

All migrated functions still work if validation/logging is removed - they're additive improvements.

## Future Enhancements

Potential improvements for future consideration:

1. **Query Performance Monitoring**
   - Add automatic slow query detection
   - Log queries exceeding threshold (e.g., >100ms)

2. **Validation Schemas**
   - Integrate Zod for complex object validation
   - Share schemas between API routes and database

3. **Retry Logic**
   - Add automatic retry for transient errors
   - Exponential backoff for lock errors

4. **Database Migrations**
   - Version-controlled schema migrations
   - Automated rollback support

5. **Connection Pooling**
   - Better-sqlite3 is single-connection
   - Consider postgres for high concurrency

## References

- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
- [SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Database Logging Best Practices](https://www.postgresql.org/docs/current/runtime-config-logging.html)

---

**Last Updated:** Phase 3 Implementation (January 2025)
**Author:** Claude Code
**Status:** Active - Ready for team adoption

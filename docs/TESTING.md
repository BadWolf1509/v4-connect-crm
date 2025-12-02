# Testing Guide

This document describes the testing strategy and how to run tests for the V4 Connect CRM project.

## Test Stack

- **Unit Tests:** Vitest
- **E2E Tests:** Playwright
- **Coverage:** Vitest built-in coverage with Istanbul

## Project Structure

```
apps/
├── api/
│   └── src/__tests__/
│       ├── routes/           # Route handler tests
│       ├── services/         # Service layer tests
│       └── middleware/       # Middleware tests
├── web/
│   ├── src/__tests__/        # Component and hook tests
│   └── e2e/                  # Playwright E2E tests
├── mobile/
│   └── src/__tests__/        # React Native tests
├── websocket/
│   └── src/__tests__/        # WebSocket server tests
└── worker/
    └── src/__tests__/        # Background worker tests

packages/
├── validators/
│   └── src/__tests__/        # Validation schema tests
└── database/
    └── src/__tests__/        # Database utility tests
```

## Running Tests

### All Tests

```bash
# Run all unit tests across all packages
pnpm test

# Run tests with coverage
pnpm test:coverage
```

### API Tests

```bash
# Run API tests only
pnpm --filter @v4-connect/api test

# Watch mode
pnpm --filter @v4-connect/api test:watch

# Coverage
pnpm --filter @v4-connect/api test:coverage
```

### Web Tests

```bash
# Unit tests
pnpm --filter @v4-connect/web test

# E2E tests (requires app running)
pnpm --filter @v4-connect/web test:e2e

# E2E with UI
pnpm --filter @v4-connect/web test:e2e:ui
```

### Mobile Tests

```bash
pnpm --filter @v4-connect/mobile test
```

## Writing Tests

### Unit Tests (Vitest)

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('MyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', async () => {
    const result = await myService.doSomething();
    expect(result).toBe(expected);
  });
});
```

### Route Tests

```typescript
import { Hono } from 'hono';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('../../lib/db', () => ({
  db: mockDbChains,
  schema: { ... },
}));

// Mock the auth middleware
vi.mock('../../middleware/auth', () => ({
  requireAuth: async (c: any, next: () => Promise<void>) => {
    c.set('auth', { tenantId: 'test-tenant', userId: 'user-1', role: 'admin' });
    await next();
  },
}));

const { myRoutes } = await import('../../routes/my-routes');

describe('My Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/my-endpoint', myRoutes);
  });

  it('should list items', async () => {
    const res = await app.request('/my-endpoint', { method: 'GET' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toHaveLength(1);
  });
});
```

### E2E Tests (Playwright)

```typescript
import { expect, test } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should display page', async ({ page }) => {
    await page.goto('/my-page');

    // Check element visibility
    await expect(page.getByRole('heading', { name: /title/i })).toBeVisible();

    // Interact with elements
    await page.getByRole('button', { name: /submit/i }).click();

    // Assert results
    await expect(page.getByText(/success/i)).toBeVisible();
  });
});
```

## Mocking Patterns

### Database Mocking

```typescript
const mockDbChains = {
  select: vi.fn(() => mockDbChains),
  from: vi.fn(() => mockDbChains),
  where: vi.fn(() => mockDbChains),
  limit: vi.fn(async () => [mockData]),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(async () => [mockData]),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(async () => [mockData]),
      })),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(() => ({
      returning: vi.fn(async () => [mockData]),
    })),
  })),
};
```

### External API Mocking

```typescript
// Mock fetch globally
vi.stubGlobal('fetch', vi.fn(async () => ({
  ok: true,
  json: async () => ({ data: 'response' }),
})));
```

## Coverage Goals

| Package | Current | Target |
|---------|---------|--------|
| API Routes | 70% | 80% |
| API Services | 65% | 80% |
| Web Hooks | 60% | 75% |
| Validators | 90% | 90% |

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to `main` branch
- Scheduled nightly runs

GitHub Actions workflow: `.github/workflows/ci.yml`

```yaml
- name: Run Tests
  run: pnpm test

- name: Run E2E Tests
  run: pnpm --filter @v4-connect/web test:e2e
```

## Best Practices

1. **Test file naming:** `*.test.ts` for unit tests, `*.spec.ts` for E2E tests
2. **One assertion per test:** Keep tests focused and readable
3. **Use descriptive names:** `it('should return 404 when user not found')`
4. **Mock external dependencies:** Never make real API calls in unit tests
5. **Clean up after tests:** Use `beforeEach`/`afterEach` hooks
6. **Test edge cases:** Empty arrays, null values, error conditions
7. **Don't test implementation details:** Test behavior, not internal state

## Debugging Tests

```bash
# Run specific test file
pnpm --filter @v4-connect/api test -- src/__tests__/routes/auth.test.ts

# Run tests matching pattern
pnpm --filter @v4-connect/api test -- --testNamePattern="login"

# Debug mode (Node inspector)
pnpm --filter @v4-connect/api test -- --inspect-brk
```

## Fixtures

Test fixtures are stored in `__fixtures__/` directories:

```
src/__tests__/
├── __fixtures__/
│   ├── users.json
│   ├── conversations.json
│   └── messages.json
└── routes/
    └── auth.test.ts
```

Load fixtures in tests:

```typescript
import users from '../__fixtures__/users.json';
```

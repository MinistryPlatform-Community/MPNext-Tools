// jest-dom v7 moved the Vitest `expect` type augmentation to this entry point.
// The bare '@testing-library/jest-dom' import registers the matchers at runtime
// but only augments Jest's types, so `toBeInTheDocument` etc. fail type checking.
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// Mock environment variables for tests
vi.stubEnv('MINISTRY_PLATFORM_BASE_URL', 'https://test-mp.example.com');
vi.stubEnv('MINISTRY_PLATFORM_CLIENT_ID', 'test-client-id');
vi.stubEnv('MINISTRY_PLATFORM_CLIENT_SECRET', 'test-client-secret');
vi.stubEnv('MINISTRY_PLATFORM_DEV_CLIENT_ID', 'test-dev-client-id');
vi.stubEnv('MINISTRY_PLATFORM_DEV_CLIENT_SECRET', 'test-dev-client-secret');
vi.stubEnv('NEXTAUTH_SECRET', 'test-secret-key-for-testing');
vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000');
vi.stubEnv('NODE_ENV', 'test');

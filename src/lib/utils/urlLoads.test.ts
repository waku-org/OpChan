import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { urlLoads } from './urlLoads';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('urlLoads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('returns false on 404', async () => {
    // Mock fetch to return a 404 response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await urlLoads('https://example.com/nonexistent.jpg');

    expect(result).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/nonexistent.jpg',
      {
        method: 'HEAD',
        signal: expect.any(AbortSignal),
        cache: 'no-cache',
      }
    );
  });

  it('returns true on successful response (200)', async () => {
    // Mock fetch to return a successful response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    const result = await urlLoads('https://example.com/image.jpg');

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/image.jpg', {
      method: 'HEAD',
      signal: expect.any(AbortSignal),
      cache: 'no-cache',
    });
  });

  it('returns false on network error', async () => {
    // Mock fetch to throw a network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await urlLoads('https://example.com/image.jpg');

    expect(result).toBe(false);
  });

  it('returns false on abort signal', async () => {
    // Mock fetch to reject with AbortError (simulating timeout)
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValueOnce(abortError);

    const result = await urlLoads('https://example.com/image.jpg', 1000);

    expect(result).toBe(false);
  });

  it('returns true for other successful status codes (e.g., 201, 301)', async () => {
    // Test 201 Created
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
    });

    const result201 = await urlLoads('https://example.com/created.jpg');
    expect(result201).toBe(true);

    // Test 301 Moved Permanently
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 301,
    });

    const result301 = await urlLoads('https://example.com/moved.jpg');
    expect(result301).toBe(true);
  });

  it('returns false for other error status codes (e.g., 403, 500)', async () => {
    // Test 403 Forbidden
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    const result403 = await urlLoads('https://example.com/forbidden.jpg');
    expect(result403).toBe(false);

    // Test 500 Internal Server Error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result500 = await urlLoads('https://example.com/error.jpg');
    expect(result500).toBe(false);
  });

  it('calls fetch with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    await urlLoads('https://example.com/test.jpg', 3000);

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/test.jpg', {
      method: 'HEAD',
      signal: expect.any(AbortSignal),
      cache: 'no-cache',
    });
  });
});

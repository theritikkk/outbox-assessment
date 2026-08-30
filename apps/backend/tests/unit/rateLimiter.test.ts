import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit, getNextAvailableWindow } from '../../src/services/rateLimiter';
import { redis } from '../../src/config/redis';

vi.mock('../../src/config/redis', () => ({
  redis: {
    eval: vi.fn(),
    get: vi.fn(),
  },
}));

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('allows requests under the limit', async () => {
      vi.setSystemTime(new Date(1700000000000)); // 1700000000000 ms -> window 472222
      
      vi.mocked(redis.eval).mockResolvedValueOnce([1, 5]); // allowed: 1, currentCount: 5

      const result = await checkRateLimit('sender123', 10);

      expect(redis.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'rate-limit:sender123:472222',
        10,
        7200
      );
      expect(result).toEqual({
        allowed: true,
        currentCount: 5,
        hourWindow: 472222,
      });
    });

    it('blocks requests at the limit', async () => {
      vi.mocked(redis.eval).mockResolvedValueOnce([0, 10]); 

      const result = await checkRateLimit('sender123', 10);

      expect(result).toEqual({
        allowed: false,
        currentCount: 10,
        hourWindow: expect.any(Number),
      });
    });

    it('handles concurrent calls within limits', async () => {
      vi.mocked(redis.eval)
        .mockResolvedValueOnce([1, 1])
        .mockResolvedValueOnce([1, 2])
        .mockResolvedValueOnce([0, 2]); // Simulate concurrent reaching limit

      const results = await Promise.all([
        checkRateLimit('sender123', 2),
        checkRateLimit('sender123', 2),
        checkRateLimit('sender123', 2),
      ]);

      expect(results[0].allowed).toBe(true);
      expect(results[1].allowed).toBe(true);
      expect(results[2].allowed).toBe(false);
    });
  });

  describe('getNextAvailableWindow', () => {
    it('returns the current window if below limit', async () => {
      vi.mocked(redis.get).mockResolvedValueOnce('5'); // Limit is 10, so window is fine

      const window = await getNextAvailableWindow('sender123', 10, 100);

      expect(redis.get).toHaveBeenCalledWith('rate-limit:sender123:100');
      expect(window).toBe(100);
    });

    it('finds the correct window if current is full', async () => {
      vi.mocked(redis.get)
        .mockResolvedValueOnce('10') // Window 100 is full
        .mockResolvedValueOnce('10') // Window 101 is full
        .mockResolvedValueOnce(null); // Window 102 is empty

      const window = await getNextAvailableWindow('sender123', 10, 100);

      expect(redis.get).toHaveBeenCalledTimes(3);
      expect(window).toBe(102);
    });
  });
});

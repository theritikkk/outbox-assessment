import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchEmails } from '../../src/integrations/elasticsearch/emailIndex';
import { esClient } from '../../src/config/elasticsearch';

vi.mock('../../src/config/elasticsearch', () => ({
  esClient: {
    search: vi.fn(),
  },
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Elasticsearch Search Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns results filtered by userId with valid query', async () => {
    const mockHits = [
      { _score: 1.5, _source: { id: 'email-1', subject: 'Test' } },
      { _score: 1.2, _source: { id: 'email-2', subject: 'Another Test' } }
    ];

    vi.mocked(esClient.search).mockResolvedValue({
      hits: {
        hits: mockHits,
        total: { value: 2 },
      }
    } as any);

    const result = await searchEmails('user-1', 'Test', 1, 20);

    expect(esClient.search).toHaveBeenCalledWith({
      index: 'emails',
      body: expect.objectContaining({
        query: {
          bool: {
            must: [
              { term: { userId: 'user-1' } },
              {
                multi_match: {
                  query: 'Test',
                  fields: ['recipient^2', 'subject^1.5', 'body'],
                  fuzziness: 'AUTO',
                },
              },
            ],
          },
        },
        from: 0,
        size: 20,
      }),
    });

    expect(result.hits).toEqual([
      { _score: 1.5, id: 'email-1', subject: 'Test' },
      { _score: 1.2, id: 'email-2', subject: 'Another Test' }
    ]);
    expect(result.total).toBe(2);
  });

  it('handles empty response from Elasticsearch', async () => {
    vi.mocked(esClient.search).mockResolvedValue({
      hits: {
        hits: [],
        total: 0,
      }
    } as any);

    const result = await searchEmails('user-1', 'Unknown', 1);

    expect(result.hits).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('returns empty results gracefully on Elasticsearch failure', async () => {
    vi.mocked(esClient.search).mockRejectedValue(new Error('ES Connection Refused'));

    const result = await searchEmails('user-1', 'Test', 1);

    expect(result.hits).toEqual([]);
    expect(result.total).toBe(0);
  });
  
  it('handles pagination correctly', async () => {
    vi.mocked(esClient.search).mockResolvedValue({
      hits: {
        hits: [],
        total: 50,
      }
    } as any);

    await searchEmails('user-1', 'Test', 3, 10); // Page 3, limit 10

    expect(esClient.search).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.objectContaining({
        from: 20, // (3 - 1) * 10
        size: 10,
      }),
    }));
  });
});

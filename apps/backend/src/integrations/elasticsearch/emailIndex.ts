import { esClient } from '../../config/elasticsearch';
import { logger } from '../../utils/logger';

const INDEX_NAME = 'emails';

export const ensureEmailIndex = async () => {
  try {
    const indexExists = await esClient.indices.exists({ index: INDEX_NAME });
    
    if (!indexExists) {
      await esClient.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              sender: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              subject: { type: 'text' },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              userId: { type: 'keyword' },
              campaignId: { type: 'keyword' },
            }
          }
        }
      });
      logger.info(`Elasticsearch index '${INDEX_NAME}' created.`);
    } else {
      logger.info(`Elasticsearch index '${INDEX_NAME}' already exists.`);
    }
  } catch (error: any) {
    logger.error('Failed to ensure Elasticsearch index', { error: error.message });
  }
};

export const indexEmail = async (email: any) => {
  try {
    await esClient.index({
      index: INDEX_NAME,
      id: email.id,
      document: {
        id: email.id,
        recipient: email.recipient,
        sender: email.sender,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt,
        sentAt: email.sentAt,
        userId: email.userId,
        campaignId: email.campaignId,
      }
    });
  } catch (error: any) {
    logger.error(`Failed to index email ${email.id} in ES`, { error: error.message });
  }
};

export const searchEmails = async (userId: string, query: string, page = 1, limit = 20) => {
  try {
    const from = (page - 1) * limit;
    
    const body: any = {
      from,
      size: limit,
      query: {
        bool: {
          must: [
            { term: { userId } },
            {
              multi_match: {
                query,
                fields: ['recipient^2', 'subject^1.5', 'body'],
                fuzziness: 'AUTO'
              }
            }
          ]
        }
      }
    };

    const response = await esClient.search({
      index: INDEX_NAME,
      body
    });

    return {
      hits: response.hits.hits.map((hit: any) => ({ _score: hit._score, ...hit._source })),
      total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0
    };
  } catch (error: any) {
    logger.error('Elasticsearch search error', { error: error.message });
    return { hits: [], total: 0 };
  }
};

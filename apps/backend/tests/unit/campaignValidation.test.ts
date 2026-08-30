import { describe, it, expect } from 'vitest';
import { createCampaignSchema } from '../../src/controllers/campaignController';

describe('Campaign Validation', () => {
  const validCampaign = {
    senderId: 'sender-123',
    subject: 'Welcome to our platform',
    body: 'Hello there, welcome!',
    recipients: ['test1@example.com', 'test2@example.com'],
    startAt: '2025-01-01T10:00:00Z',
  };

  it('passes for valid campaign data', () => {
    const result = createCampaignSchema.safeParse(validCampaign);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.delayBetweenEmails).toBe(2);
      expect(result.data.hourlyLimit).toBe(200);
    }
  });

  it('fails when subject is missing or empty', () => {
    const data = { ...validCampaign, subject: '' };
    const result = createCampaignSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.subject).toBeDefined();
    }
  });

  it('fails when recipients array is empty', () => {
    const data = { ...validCampaign, recipients: [] };
    const result = createCampaignSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.recipients).toBeDefined();
    }
  });

  it('fails when recipients contains invalid emails', () => {
    const data = { ...validCampaign, recipients: ['valid@example.com', 'invalid-email'] };
    const result = createCampaignSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.recipients).toBeDefined();
    }
  });

  it('applies default values for delayBetweenEmails and hourlyLimit', () => {
    const result = createCampaignSchema.safeParse(validCampaign);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.delayBetweenEmails).toBe(2);
      expect(result.data.hourlyLimit).toBe(200);
    }
  });

  it('accepts provided values for delayBetweenEmails and hourlyLimit', () => {
    const data = { ...validCampaign, delayBetweenEmails: 5, hourlyLimit: 100 };
    const result = createCampaignSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.delayBetweenEmails).toBe(5);
      expect(result.data.hourlyLimit).toBe(100);
    }
  });
  
  it('fails when startAt is missing', () => {
    const { startAt, ...dataWithoutStartAt } = validCampaign;
    const result = createCampaignSchema.safeParse(dataWithoutStartAt);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.startAt).toBeDefined();
    }
  });
});

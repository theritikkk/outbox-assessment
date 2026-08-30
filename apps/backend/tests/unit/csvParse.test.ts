import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadCsv } from '../../src/controllers/emailController';
import { Request, Response } from 'express';

describe('CSV Parser (uploadCsv)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = vi.fn();
  });

  const createReq = (fileContent: string | null) => {
    return {
      file: fileContent !== null ? { buffer: Buffer.from(fileContent) } : undefined,
    } as Request;
  };

  it('handles empty file upload', async () => {
    mockReq = createReq(null);
    await uploadCsv(mockReq as Request, mockRes as Response, mockNext);
    
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'No file uploaded' });
  });

  it('parses valid CSV with "email" column header', async () => {
    mockReq = createReq('email,name\ntest@example.com,Test\nuser@domain.com,User');
    await uploadCsv(mockReq as Request, mockRes as Response, mockNext);
    
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: {
        emails: ['test@example.com', 'user@domain.com'],
        count: 2,
        invalidCount: 0,
        duplicateCount: 0,
        invalidEmails: [],
      },
    });
  });

  it('parses CSV with mixed case headers', async () => {
    mockReq = createReq('EMAIL,name\nTEST1@example.com,Test1\n\nEmail,name\ntest2@example.com,Test2');
    await uploadCsv(mockReq as Request, mockRes as Response, mockNext);
    
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        emails: ['test1@example.com', 'test2@example.com'],
        count: 2,
      }),
    });
  });

  it('parses plain text file with one email per line', async () => {
    // csv-parse will throw if columns:true and format is bad, or we hit fallback
    // Actually, fallback hits if parse throws. But parse might not throw for single column.
    mockReq = createReq('test1@example.com\ntest2@example.com\ninvalid-email');
    await uploadCsv(mockReq as Request, mockRes as Response, mockNext);
    
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        emails: ['test1@example.com', 'test2@example.com'],
        count: 2,
        invalidCount: 1,
      }),
    });
  });

  it('deduplicates emails', async () => {
    mockReq = createReq('email\ntest@example.com\ntest@example.com\nTEST@example.com');
    await uploadCsv(mockReq as Request, mockRes as Response, mockNext);
    
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        emails: ['test@example.com'],
        count: 1,
        duplicateCount: 2,
      }),
    });
  });

  it('filters invalid emails', async () => {
    mockReq = createReq('email\nvalid@example.com\nnot-an-email\nanother-invalid\nvalid2@test.com');
    await uploadCsv(mockReq as Request, mockRes as Response, mockNext);
    
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        emails: ['valid@example.com', 'valid2@test.com'],
        count: 2,
        invalidCount: 2,
        invalidEmails: ['not-an-email', 'another-invalid'],
      }),
    });
  });
  
  it('handles empty file content gracefully', async () => {
    mockReq = createReq('');
    await uploadCsv(mockReq as Request, mockRes as Response, mockNext);
    
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        emails: [],
        count: 0,
      }),
    });
  });
});

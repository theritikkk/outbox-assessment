import { describe, it, expect, vi } from 'vitest';
import { requireAuth } from '../../src/middleware/auth';
import { Request, Response } from 'express';

describe('Auth Middleware', () => {
  it('returns 401 for unauthenticated requests', () => {
    const req = {
      isAuthenticated: vi.fn().mockReturnValue(false),
    } as unknown as Request;

    const jsonMock = vi.fn();
    const res = {
      status: vi.fn().mockReturnValue({ json: jsonMock }),
    } as unknown as Response;

    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows authenticated requests to pass through', () => {
    const req = {
      isAuthenticated: vi.fn().mockReturnValue(true),
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
  });
  
  it('returns 401 if isAuthenticated is not defined', () => {
    const req = {} as Request;

    const jsonMock = vi.fn();
    const res = {
      status: vi.fn().mockReturnValue({ json: jsonMock }),
    } as unknown as Response;

    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });
});

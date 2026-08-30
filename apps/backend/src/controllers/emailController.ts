import { Request, Response, NextFunction } from 'express';
import { parse } from 'csv-parse/sync';
import * as emailService from '../services/emailService';
import { z } from 'zod';

export const scheduled = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const emails = await emailService.getScheduledEmails(req.user!.id);
    res.json({ success: true, data: emails });
  } catch (error) {
    next(error);
  }
};

export const sent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const emails = await emailService.getSentEmails(req.user!.id);
    res.json({ success: true, data: emails });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = await emailService.getEmailById(req.user!.id, req.params.id);
    res.json({ success: true, data: email });
  } catch (error) {
    next(error);
  }
};

export const search = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }
    const results = await emailService.searchEmails(req.user!.id, query, page);
    res.json({ success: true, data: results.hits, total: results.total });
  } catch (error) {
    next(error);
  }
};

export const uploadCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const fileContent = req.file.buffer.toString('utf-8').trim();
    if (!fileContent) {
      return res.json({
        success: true,
        data: {
          emails: [],
          count: 0,
          invalidCount: 0,
          duplicateCount: 0,
          invalidEmails: [],
        },
      });
    }

    const emailSchema = z.string().email();
    const validEmails: string[] = [];
    const invalidEmails: string[] = [];

    // Attempt 1: Parse CSV without assuming headers to inspect structure
    let parsedWithHeader = false;
    try {
      const records = parse(fileContent, { columns: true, skip_empty_lines: true, trim: true });
      if (records.length > 0) {
        const firstRecord = records[0];
        const hasEmailHeader = Object.keys(firstRecord).some(k => k.toLowerCase() === 'email');
        
        if (hasEmailHeader) {
          parsedWithHeader = true;
          for (const record of records) {
            const email = (record.email || record.Email || record.EMAIL || '').trim();
            if (email && emailSchema.safeParse(email).success) {
              validEmails.push(email.toLowerCase());
            } else if (email) {
              invalidEmails.push(email);
            }
          }
        }
      }
    } catch {
      // ignore parse errors and proceed to fallback
    }

    // Fallback: Line-by-line / raw parsing (supports raw email lists or headerless CSVs)
    if (!parsedWithHeader) {
      const lines = fileContent.split(/[\r\n,]+/).map(l => l.trim()).filter(l => l.length > 0);
      for (const token of lines) {
        if (token.toLowerCase() === 'email' || token.toLowerCase() === 'emails') {
          continue;
        }
        if (emailSchema.safeParse(token).success) {
          validEmails.push(token.toLowerCase());
        } else {
          invalidEmails.push(token);
        }
      }
    }

    // Deduplicate
    const uniqueEmails = [...new Set(validEmails)];
    const duplicateCount = validEmails.length - uniqueEmails.length;

    res.json({
      success: true,
      data: {
        emails: uniqueEmails,
        count: uniqueEmails.length,
        invalidCount: invalidEmails.length,
        duplicateCount,
        invalidEmails: invalidEmails.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

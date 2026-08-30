import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, printf, colorize, json } = winston.format;

const customFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: env.NODE_ENV === 'production' 
    ? combine(timestamp(), json())
    : combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), customFormat),
  transports: [
    new winston.transports.Console(),
  ],
});

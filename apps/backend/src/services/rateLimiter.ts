import { redis } from '../config/redis';

const RATE_LIMIT_LUA = `
  local current = redis.call('get', KEYS[1])
  if current and tonumber(current) >= tonumber(ARGV[1]) then
    return {0, tonumber(current)}
  end
  current = redis.call('incr', KEYS[1])
  if tonumber(current) == 1 then
    redis.call('expire', KEYS[1], ARGV[2])
  end
  return {1, tonumber(current)}
`;

export const checkRateLimit = async (senderId: string, hourlyLimit: number): Promise<{allowed: boolean, currentCount: number, hourWindow: number}> => {
  const hourWindow = Math.floor(Date.now() / 3600000);
  const key = `rate-limit:${senderId}:${hourWindow}`;
  
  const result = await redis.eval(RATE_LIMIT_LUA, 1, key, hourlyLimit, 7200) as [number, number];
  
  return {
    allowed: result[0] === 1,
    currentCount: result[1],
    hourWindow,
  };
};

export const getNextAvailableWindow = async (senderId: string, hourlyLimit: number, startWindow: number): Promise<number> => {
  let currentWindow = startWindow;
  while (true) {
    const key = `rate-limit:${senderId}:${currentWindow}`;
    const count = await redis.get(key);
    if (!count || parseInt(count, 10) < hourlyLimit) {
      return currentWindow;
    }
    currentWindow++;
  }
};

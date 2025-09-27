import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    blocked?: boolean;
    blockExpiry?: number;
  };
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private store: RateLimitStore = {};
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;

  constructor(private readonly configService: ConfigService) {
    this.maxAttempts = parseInt(
      this.configService.get('RATE_LIMIT_MAX_ATTEMPTS', '5'),
    );
    this.windowMs = parseInt(
      this.configService.get('RATE_LIMIT_WINDOW_MS', '900000'), // 15 minutes
    );
    this.blockDurationMs = parseInt(
      this.configService.get('RATE_LIMIT_BLOCK_DURATION_MS', '3600000'), // 1 hour
    );

    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Only apply rate limiting to authentication endpoints
    if (!this.isAuthEndpoint(req.path)) {
      return next();
    }

    const identifier = this.getIdentifier(req);
    const now = Date.now();

    // Check if user is currently blocked
    if (this.isBlocked(identifier, now)) {
      throw new HttpException(
        {
          message: 'Too many failed attempts. Account temporarily locked.',
          retryAfter: Math.ceil(
            (this.store[identifier].blockExpiry - now) / 1000,
          ),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Initialize or reset if window expired
    if (!this.store[identifier] || now > this.store[identifier].resetTime) {
      this.store[identifier] = {
        count: 0,
        resetTime: now + this.windowMs,
      };
    }

    // Check rate limit
    if (this.store[identifier].count >= this.maxAttempts) {
      // Block the user
      this.store[identifier].blocked = true;
      this.store[identifier].blockExpiry = now + this.blockDurationMs;

      throw new HttpException(
        {
          message: 'Rate limit exceeded. Account temporarily locked.',
          retryAfter: Math.ceil(this.blockDurationMs / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment attempt count for failed requests (handled in error interceptor)
    req['rateLimitData'] = {
      identifier,
      incrementCount: () => {
        if (this.store[identifier]) {
          this.store[identifier].count++;
        }
      },
      resetCount: () => {
        if (this.store[identifier]) {
          delete this.store[identifier];
        }
      },
    };

    next();
  }

  private isAuthEndpoint(path: string): boolean {
    const authPaths = ['/auth/sign-in', '/auth/sign-up', '/auth/refresh'];
    return authPaths.some((authPath) => path.includes(authPath));
  }

  private getIdentifier(req: Request): string {
    // Use IP address and User-Agent for identification
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    return `${ip}:${Buffer.from(userAgent).toString('base64').substring(0, 20)}`;
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  private isBlocked(identifier: string, now: number): boolean {
    const entry = this.store[identifier];
    return entry?.blocked && entry.blockExpiry > now;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Object.entries(this.store)) {
      if (
        (entry.resetTime < now && !entry.blocked) ||
        (entry.blocked && entry.blockExpiry < now)
      ) {
        delete this.store[key];
      }
    }
  }
}

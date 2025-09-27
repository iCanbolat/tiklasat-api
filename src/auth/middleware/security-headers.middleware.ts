import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Remove sensitive headers that might reveal server information
    res.removeHeader('X-Powered-By');

    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      this.isProduction
        ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none';"
        : "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: http: https:;",
    );

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // XSS Protection (legacy, but still useful)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (formerly Feature Policy)
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), location=(), payment=(), usb=()',
    );

    // Strict Transport Security (HTTPS only)
    if (this.isProduction) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }

    // Cross-Origin policies for API security
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    // Cache control for sensitive endpoints
    if (this.isSensitiveEndpoint(req.path)) {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, private',
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  }

  private isSensitiveEndpoint(path: string): boolean {
    const sensitivePatterns = [
      '/auth/',
      '/api/auth/',
      '/user/',
      '/admin/',
      '/payment/',
    ];
    return sensitivePatterns.some((pattern) => path.includes(pattern));
  }
}

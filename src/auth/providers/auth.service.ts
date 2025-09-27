import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { DrizzleService } from 'src/database/drizzle.service';
import { HashingService } from './hashing.service';
import { eq } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from '../dto/sign-up.dto';
import { UserTable } from 'src/database/schemas/users.schema';
import {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';
import { UserPayload } from '../interfaces/request-with-user';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService {
  private readonly jwtTtl: number;
  private readonly logger = new Logger(AuthService.name);
  private readonly isProduction: boolean;
  private readonly cookieDomain: string;

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly hashingService: HashingService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {
    this.jwtTtl = parseInt(
      this.configService.getOrThrow<string>('JWT_TOKEN_TTL'),
    );
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
    this.cookieDomain = this.configService.get('COOKIE_DOMAIN');
  }

  private calculateExpiration(milliseconds: number): Date {
    const date = new Date();
    date.setTime(date.getTime() + milliseconds);
    return date;
  }

  async validateUser(email: string, password: string): Promise<any> {
    const [user] = await this.drizzleService.db
      .select()
      .from(UserTable)
      .where(eq(UserTable.email, email));

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const isPasswordValid = await this.hashingService.compare(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    delete user.password;
    return user;
  }

  async signUp(
    signUpDto: SignUpDto,
    response: ExpressResponse,
    request: ExpressRequest,
  ) {
    const [userWithEmail] = await this.drizzleService.db
      .select()
      .from(UserTable)
      .where(eq(UserTable.email, signUpDto.email));

    if (userWithEmail) {
      throw new BadRequestException('Email already used');
    }

    const hashedPassword = await this.hashingService.hash(signUpDto.password);
    const [user] = await this.drizzleService.db
      .insert(UserTable)
      .values({
        name: `${signUpDto.firstName} ${signUpDto.lastName}`,
        email: signUpDto.email,
        password: hashedPassword,
      })
      .returning();

    delete user.password;

    this.logger.log(`User ${user.name} has created as ${user.role}.`);

    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return await this.generateTokens(payload, response, request);
  }

  async logout(
    response: ExpressResponse,
    request: ExpressRequest,
    userId?: string,
  ) {
    try {
      // Revoke refresh token if user is authenticated
      if (userId) {
        const refreshToken = request.cookies?.refresh_token;
        if (refreshToken) {
          // Extract token ID and revoke it
          try {
            const payload = this.jwtService.decode(refreshToken) as any;
            if (payload?.jti) {
              await this.refreshTokenService.revokeToken(
                payload.jti,
                'logout',
                userId,
              );
            }
          } catch (error) {
            this.logger.warn(
              'Failed to revoke refresh token during logout',
              error,
            );
          }
        }
      }

      // Clear cookies with same settings as when they were set
      this.clearSecureCookie(response, 'access_token');
      this.clearSecureCookie(response, 'refresh_token');

      this.logger.log('User logged out successfully', {
        userId: userId || 'unknown',
      });

      return { message: 'Logout successful!' };
    } catch (error) {
      this.logger.error('Logout failed', error);
      // Still clear cookies even if token revocation fails
      this.clearSecureCookie(response, 'access_token');
      this.clearSecureCookie(response, 'refresh_token');
      return { message: 'Logout completed with warnings' };
    }
  }

  /**
   * Clear secure cookies properly
   */
  private clearSecureCookie(response: ExpressResponse, name: string): void {
    response.clearCookie(name, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
      ...(this.cookieDomain && { domain: this.cookieDomain }),
      path: '/',
    });
  }

  async generateTokens(
    user: UserPayload,
    response: ExpressResponse,
    request: ExpressRequest,
    oldTokenId?: string,
  ) {
    const expiresAccessTokenCookie = this.calculateExpiration(this.jwtTtl);
    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers['user-agent'] || 'unknown';

    // Generate access token
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role, type: 'access' },
      { expiresIn: `${this.jwtTtl}ms` },
    );

    // Generate secure refresh token with rotation
    const refreshTokenData =
      await this.refreshTokenService.generateRefreshToken(
        user,
        ipAddress,
        userAgent,
        oldTokenId,
      );

    // Set secure cookies
    this.setSecureCookie(
      response,
      'access_token',
      accessToken,
      expiresAccessTokenCookie,
    );
    this.setSecureCookie(
      response,
      'refresh_token',
      refreshTokenData.token,
      refreshTokenData.expiresAt,
    );

    this.logger.log(`Tokens generated for user ${user.id}`, {
      userId: user.id,
      ipAddress,
      userAgent: userAgent.substring(0, 100), // Truncate for logging
      rotation: !!oldTokenId,
    });

    return {
      accessToken,
      refreshToken: refreshTokenData.token,
      expiresAt: refreshTokenData.expiresAt,
    };
  }

  /**
   * Set secure cookie with environment-appropriate settings
   */
  private setSecureCookie(
    response: ExpressResponse,
    name: string,
    value: string,
    expires: Date,
  ): void {
    response.cookie(name, value, {
      httpOnly: true,
      secure: this.isProduction, // Only secure in production (HTTPS)
      sameSite: this.isProduction ? 'strict' : 'lax', // More flexible in development
      expires,
      ...(this.cookieDomain && { domain: this.cookieDomain }),
      path: '/',
    });
  }

  /**
   * Extract client IP address with proxy support
   */
  private getClientIp(request: ExpressRequest): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Refresh access token using refresh token rotation
   */
  async refreshTokens(
    refreshToken: string,
    response: ExpressResponse,
    request: ExpressRequest,
  ) {
    const ipAddress = this.getClientIp(request);

    // Validate refresh token
    const user = await this.refreshTokenService.validateRefreshToken(
      refreshToken,
      ipAddress,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Extract old token ID for rotation
    let oldTokenId: string | undefined;
    try {
      const payload = this.jwtService.decode(refreshToken) as any;
      oldTokenId = payload?.jti;
    } catch (error) {
      this.logger.warn('Failed to extract token ID for rotation', error);
    }

    // Generate new tokens (this will revoke the old refresh token)
    return await this.generateTokens(user, response, request, oldTokenId);
  }

  /**
   * Revoke all sessions for security purposes
   */
  async revokeAllSessions(userId: string, reason: string = 'security_action') {
    await this.refreshTokenService.revokeAllUserTokens(userId, reason);
    this.logger.log(`All sessions revoked for user ${userId}`, { reason });
    return { message: 'All sessions revoked successfully' };
  }

  /**
   * Get user active sessions
   */
  async getUserSessions(userId: string) {
    return await this.refreshTokenService.getUserSessions(userId);
  }
}

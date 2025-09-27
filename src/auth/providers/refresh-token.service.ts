import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DrizzleService } from 'src/database/drizzle.service';
import { RefreshTokenTable } from 'src/database/schemas/refresh-tokens.schema';
import { eq, and, lt } from 'drizzle-orm';
import { UserPayload } from '../interfaces/request-with-user';
import { randomBytes } from 'crypto';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);
  private readonly refreshTokenTtl: number;
  private readonly refreshTokenSecret: string;

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.refreshTokenTtl = parseInt(
      this.configService.getOrThrow<string>('REFRESH_TOKEN_TTL'),
    );
    this.refreshTokenSecret = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_SECRET',
    );
  }

  /**
   * Generate a secure refresh token with rotation support
   */
  async generateRefreshToken(
    user: UserPayload,
    ipAddress: string,
    userAgent: string,
    oldTokenId?: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + this.refreshTokenTtl);

    // Create unique token with JWT and additional entropy
    const jti = randomBytes(16).toString('hex'); // Unique token ID
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        jti, // JWT ID for tracking
        type: 'refresh',
      },
      {
        secret: this.refreshTokenSecret,
        expiresIn: `${this.refreshTokenTtl}ms`,
      },
    );

    try {
      // Store token in database with metadata
      await this.drizzleService.db.insert(RefreshTokenTable).values({
        token: jti, // Store only the unique ID, not the full JWT
        userId: user.id,
        expiresAt,
        ipAddress,
        userAgent,
        lastUsedAt: new Date(),
      });

      // Revoke old refresh token if rotation
      if (oldTokenId) {
        await this.revokeToken(oldTokenId, 'rotation', user.id);
      }

      this.logger.log(`Refresh token generated for user ${user.id}`, {
        userId: user.id,
        tokenId: jti,
        expiresAt: expiresAt.toISOString(),
        rotation: !!oldTokenId,
      });

      return { token: refreshToken, expiresAt };
    } catch (error) {
      this.logger.error('Failed to generate refresh token', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Validate refresh token and return user payload
   */
  async validateRefreshToken(
    token: string,
    ipAddress: string,
  ): Promise<UserPayload | null> {
    try {
      // Verify JWT signature and extract JTI
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.refreshTokenSecret,
      });

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if token exists in database and is not revoked
      const [dbToken] = await this.drizzleService.db
        .select()
        .from(RefreshTokenTable)
        .where(
          and(
            eq(RefreshTokenTable.token, payload.jti),
            eq(RefreshTokenTable.isRevoked, 'false'),
            eq(RefreshTokenTable.userId, payload.sub),
          ),
        );

      if (!dbToken) {
        this.logger.warn('Refresh token not found or revoked', {
          tokenId: payload.jti,
          userId: payload.sub,
          ipAddress,
        });
        return null;
      }

      // Check if token is expired
      if (dbToken.expiresAt < new Date()) {
        await this.revokeToken(payload.jti, 'expired', payload.sub);
        return null;
      }

      // Update last used timestamp
      await this.drizzleService.db
        .update(RefreshTokenTable)
        .set({ lastUsedAt: new Date() })
        .where(eq(RefreshTokenTable.token, payload.jti));

      // Security check: validate IP address (optional, configurable)
      if (this.configService.get('STRICT_IP_VALIDATION') === 'true') {
        if (dbToken.ipAddress !== ipAddress) {
          this.logger.warn('IP address mismatch for refresh token', {
            tokenId: payload.jti,
            originalIp: dbToken.ipAddress,
            currentIp: ipAddress,
            userId: payload.sub,
          });
          await this.revokeToken(payload.jti, 'security_breach', payload.sub);
          return null;
        }
      }

      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch (error) {
      this.logger.error('Refresh token validation failed', error);
      return null;
    }
  }

  /**
   * Revoke a single refresh token
   */
  async revokeToken(
    tokenId: string,
    reason: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.drizzleService.db
        .update(RefreshTokenTable)
        .set({
          isRevoked: 'true',
          revokedAt: new Date(),
          revokedReason: reason,
        })
        .where(
          and(
            eq(RefreshTokenTable.token, tokenId),
            eq(RefreshTokenTable.userId, userId),
          ),
        );

      this.logger.log(`Refresh token revoked`, {
        tokenId,
        userId,
        reason,
      });
    } catch (error) {
      this.logger.error('Failed to revoke refresh token', error);
    }
  }

  /**
   * Revoke all refresh tokens for a user (useful for security incidents)
   */
  async revokeAllUserTokens(
    userId: string,
    reason: string = 'logout_all',
  ): Promise<void> {
    try {
      await this.drizzleService.db
        .update(RefreshTokenTable)
        .set({
          isRevoked: 'true',
          revokedAt: new Date(),
          revokedReason: reason,
        })
        .where(
          and(
            eq(RefreshTokenTable.userId, userId),
            eq(RefreshTokenTable.isRevoked, 'false'),
          ),
        );

      this.logger.log(`All refresh tokens revoked for user`, {
        userId,
        reason,
      });
    } catch (error) {
      this.logger.error('Failed to revoke all user tokens', error);
    }
  }

  /**
   * Cleanup expired tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await this.drizzleService.db
        .delete(RefreshTokenTable)
        .where(lt(RefreshTokenTable.expiresAt, new Date()));

      this.logger.log(`Cleaned up expired refresh tokens`, {
        deletedCount: result.rowCount || 0,
      });
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens', error);
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string) {
    return await this.drizzleService.db
      .select({
        id: RefreshTokenTable.id,
        createdAt: RefreshTokenTable.createdAt,
        lastUsedAt: RefreshTokenTable.lastUsedAt,
        ipAddress: RefreshTokenTable.ipAddress,
        userAgent: RefreshTokenTable.userAgent,
        expiresAt: RefreshTokenTable.expiresAt,
      })
      .from(RefreshTokenTable)
      .where(
        and(
          eq(RefreshTokenTable.userId, userId),
          eq(RefreshTokenTable.isRevoked, 'false'),
        ),
      )
      .orderBy(RefreshTokenTable.lastUsedAt);
  }
}

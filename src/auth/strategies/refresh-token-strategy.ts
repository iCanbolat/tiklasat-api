import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => {
          return req.cookies?.refresh_token || null;
        },
      ]),
      secretOrKey: configService.get('REFRESH_TOKEN_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    // Validate that this is actually a refresh token
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    console.log('RefreshTokenPayload:', payload);

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tokenId: payload.jti, // Include token ID for rotation
    };
  }
}
